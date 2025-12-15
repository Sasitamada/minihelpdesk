const express = require('express');
const router = express.Router();

// Get all comments for a task (with threading support)
router.get('/task/:taskId', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT c.*, 
              u.id as user_id, u.username, u.full_name, u.avatar,
              assigned_user.id as assigned_user_id, assigned_user.username as assigned_username, 
              assigned_user.full_name as assigned_full_name, assigned_user.avatar as assigned_avatar
       FROM comments c
       LEFT JOIN users u ON c.author = u.id
       LEFT JOIN users assigned_user ON c.assigned_to = assigned_user.id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.taskId]
    );
    
    // Transform to include author and assigned user info, build thread structure
    const commentsMap = new Map();
    const rootComments = [];
    
    rows.forEach(row => {
      const comment = {
        id: row.id,
        content: row.content,
        task_id: row.task_id,
        parent_comment_id: row.parent_comment_id,
        assigned_to: row.assigned_to,
        mentions: row.mentions ? (typeof row.mentions === 'string' ? JSON.parse(row.mentions) : row.mentions) : [],
        attachments: row.attachments ? (typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments) : [],
        created_at: row.created_at,
        updated_at: row.updated_at,
        author: {
          id: row.user_id,
          username: row.username,
          full_name: row.full_name,
          avatar: row.avatar
        },
        assigned_user: row.assigned_user_id ? {
          id: row.assigned_user_id,
          username: row.assigned_username,
          full_name: row.assigned_full_name,
          avatar: row.assigned_avatar
        } : null,
        replies: []
      };
      
      commentsMap.set(comment.id, comment);
      
      if (comment.parent_comment_id) {
        const parent = commentsMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(comment);
        } else {
          // Parent not loaded yet, add to root for now
          rootComments.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });
    
    // Build final tree structure
    const buildTree = (comments) => {
      return comments
        .filter(c => !c.parent_comment_id)
        .map(comment => {
          const replies = comments.filter(c => c.parent_comment_id === comment.id);
          return {
            ...comment,
            replies: buildTree(replies)
          };
        });
    };
    
    res.json(buildTree(Array.from(commentsMap.values())));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single comment
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query('SELECT * FROM comments WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Comment not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create comment (with threading, mentions, and assigned support)
router.post('/', async (req, res) => {
  try {
    const { content, task, author, attachments, parent_comment_id, assigned_to, mentions } = req.body;
    
    // Extract mentioned users from content if not provided
    let extractedMentions = mentions || [];
    if (!mentions && content) {
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        extractedMentions.push(match[1]);
      }
    }
    
    // Resolve mention usernames to user IDs
    const mentionUserIds = [];
    for (const username of extractedMentions) {
      const userResult = await req.app.locals.pool.query(
        'SELECT id FROM users WHERE username = $1 OR email = $1',
        [username]
      );
      if (userResult.rows.length > 0) {
        mentionUserIds.push(userResult.rows[0].id);
      }
    }
    
    // Get author info for the response
    const authorResult = await req.app.locals.pool.query(
      'SELECT id, username, full_name, avatar FROM users WHERE id = $1',
      [author]
    );
    
    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO comments (content, task_id, author, attachments, parent_comment_id, assigned_to, mentions) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        content, 
        task, 
        author, 
        JSON.stringify(attachments || []),
        parent_comment_id || null,
        assigned_to || null,
        JSON.stringify(mentionUserIds)
      ]
    );
    
    const comment = rows[0];
    
    // Get assigned user info if assigned
    let assignedUser = null;
    if (comment.assigned_to) {
      const assignedResult = await req.app.locals.pool.query(
        'SELECT id, username, full_name, avatar FROM users WHERE id = $1',
        [comment.assigned_to]
      );
      assignedUser = assignedResult.rows[0] || null;
    }
    
    const commentWithAuthor = {
      ...comment,
      mentions: mentionUserIds,
      author: authorResult.rows[0] || { id: author },
      assigned_user: assignedUser,
      replies: []
    };
    
    // Create notifications for mentioned users
    for (const userId of mentionUserIds) {
      try {
        await req.app.locals.pool.query(
          `INSERT INTO notifications (user_id, from_user_id, type, message, related_id, related_type)
           VALUES ($1, $2, 'mention', $3, $4, 'comment')`,
          [userId, author, `You were mentioned in a comment on task ${task}`, comment.id]
        );
      } catch (err) {
        console.log('Notification creation skipped:', err.message);
      }
    }
    
    // Create notification for assigned user
    if (assigned_to && assigned_to !== author) {
      try {
        await req.app.locals.pool.query(
          `INSERT INTO notifications (user_id, from_user_id, type, message, related_id, related_type)
           VALUES ($1, $2, 'comment_assigned', $3, $4, 'comment')`,
          [assigned_to, author, `A comment was assigned to you on task ${task}`, comment.id]
        );
      } catch (err) {
        console.log('Notification creation skipped:', err.message);
      }
    }
    
    // Log activity history
    try {
      await req.app.locals.pool.query(
        `INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
         VALUES ($1, $2, 'commented', 'comment', NULL, $3)`,
        [task, author, `Comment: ${content.substring(0, 50)}...`]
      );
    } catch (err) {
      console.log('Activity history logging skipped:', err.message);
    }
    
    // Emit real-time update via WebSocket
    if (req.app.locals.io) {
      req.app.locals.io.to(`task-${task}`).emit('new-comment', commentWithAuthor);
      // Notify mentioned users
      for (const userId of mentionUserIds) {
        req.app.locals.io.to(`user-${userId}`).emit('mention', {
          comment: commentWithAuthor,
          taskId: task
        });
      }
      // Notify assigned user
      if (assigned_to) {
        req.app.locals.io.to(`user-${assigned_to}`).emit('comment-assigned', {
          comment: commentWithAuthor,
          taskId: task
        });
      }
    }
    
    res.status(201).json(commentWithAuthor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update comment (supports assigning/unassigning)
router.put('/:id', async (req, res) => {
  try {
    const { content, assigned_to } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    
    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      values.push(assigned_to || null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);
    
    const { rows } = await req.app.locals.pool.query(
      `UPDATE comments SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    const comment = rows[0];
    
    // Get author and assigned user info
    const authorResult = await req.app.locals.pool.query(
      'SELECT id, username, full_name, avatar FROM users WHERE id = $1',
      [comment.author]
    );
    
    let assignedUser = null;
    if (comment.assigned_to) {
      const assignedResult = await req.app.locals.pool.query(
        'SELECT id, username, full_name, avatar FROM users WHERE id = $1',
        [comment.assigned_to]
      );
      assignedUser = assignedResult.rows[0] || null;
    }
    
    const commentWithAuthor = {
      ...comment,
      author: authorResult.rows[0] || { id: comment.author },
      assigned_user: assignedUser,
      mentions: comment.mentions ? (typeof comment.mentions === 'string' ? JSON.parse(comment.mentions) : comment.mentions) : [],
      attachments: comment.attachments ? (typeof comment.attachments === 'string' ? JSON.parse(comment.attachments) : comment.attachments) : []
    };
    
    // Create notification if comment was assigned
    if (assigned_to && assigned_to !== comment.author) {
      try {
        await req.app.locals.pool.query(
          `INSERT INTO notifications (user_id, from_user_id, type, message, related_id, related_type)
           VALUES ($1, $2, 'comment_assigned', $3, $4, 'comment')`,
          [assigned_to, comment.author, `A comment was assigned to you`, comment.id]
        );
      } catch (err) {
        console.log('Notification creation skipped:', err.message);
      }
    }
    
    res.json(commentWithAuthor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get comments assigned to a user
router.get('/assigned/:userId', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT c.*, u.id as user_id, u.username, u.full_name, u.avatar,
              t.title as task_title, t.id as task_id
       FROM comments c
       LEFT JOIN users u ON c.author = u.id
       LEFT JOIN tasks t ON c.task_id = t.id
       WHERE c.assigned_to = $1
       ORDER BY c.created_at DESC`,
      [req.params.userId]
    );
    
    const comments = rows.map(row => ({
      ...row,
      author: {
        id: row.user_id,
        username: row.username,
        full_name: row.full_name,
        avatar: row.avatar
      },
      task: {
        id: row.task_id,
        title: row.task_title
      },
      mentions: row.mentions ? (typeof row.mentions === 'string' ? JSON.parse(row.mentions) : row.mentions) : [],
      attachments: row.attachments ? (typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments) : []
    }));
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete comment
router.delete('/:id', async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM comments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;