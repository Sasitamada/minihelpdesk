const express = require('express');
const router = express.Router();

// Unified search endpoint
router.get('/', async (req, res) => {
  try {
    const {
      q, // search query text
      workspaceId,
      listId,
      spaceId,
      status,
      priority,
      assignee,
      tags,
      dueDateFrom,
      dueDateTo,
      createdBy,
      createdDateFrom,
      createdDateTo,
      includeComments = 'false',
      includeSubtasks = 'true',
      type = 'all', // 'tasks', 'comments', 'lists', 'all'
      page = 1,
      perPage = 50
    } = req.query;

    const results = {
      tasks: [],
      comments: [],
      lists: [],
      total: 0
    };

    const offset = (parseInt(page) - 1) * parseInt(perPage);

    // Build task search query
    if (type === 'all' || type === 'tasks') {
      let taskQuery = `
        SELECT DISTINCT
          t.*,
          COALESCE((
            SELECT COUNT(*)
            FROM task_dependencies td
            JOIN tasks bt ON bt.id = td.dependency_task_id
            WHERE td.task_id = t.id AND bt.status <> 'done'
          ), 0) AS blocked_count
        FROM tasks t
        WHERE 1=1
      `;
      const taskParams = [];
      let paramIndex = 1;

      // Workspace filter
      if (workspaceId) {
        taskQuery += ` AND t.workspace_id = $${paramIndex++}`;
        taskParams.push(workspaceId);
      }

      // List filter
      if (listId) {
        taskQuery += ` AND t.list_id = $${paramIndex++}`;
        taskParams.push(listId);
      }

      // Space filter (via list)
      if (spaceId) {
        taskQuery += ` AND EXISTS (
          SELECT 1 FROM lists l WHERE l.id = t.list_id AND l.space_id = $${paramIndex}
        )`;
        taskParams.push(spaceId);
        paramIndex++;
      }

      // Text search
      if (q) {
        const searchTerm = `%${q}%`;
        taskQuery += ` AND (
          t.title ILIKE $${paramIndex} OR
          t.description ILIKE $${paramIndex + 1} OR
          CAST(t.id AS TEXT) LIKE $${paramIndex + 2}
        )`;
        taskParams.push(searchTerm, searchTerm, `%${q}%`);
        paramIndex += 3;
      }

      // Status filter
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        taskQuery += ` AND t.status = ANY($${paramIndex++})`;
        taskParams.push(statusArray);
      }

      // Priority filter
      if (priority) {
        const priorityArray = Array.isArray(priority) ? priority : [priority];
        taskQuery += ` AND t.priority = ANY($${paramIndex++})`;
        taskParams.push(priorityArray);
      }

      // Assignee filter
      if (assignee) {
        const assigneeArray = Array.isArray(assignee) ? assignee : [assignee];
        taskQuery += ` AND EXISTS (
          SELECT 1 FROM task_assignees ta
          WHERE ta.task_id = t.id AND ta.user_id = ANY($${paramIndex})
        )`;
        taskParams.push(assigneeArray);
        paramIndex++;
      }

      // Tags filter
      if (tags) {
        const tagsArray = Array.isArray(tags) ? tags : [tags];
        taskQuery += ` AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(t.tags) AS tag
          WHERE tag = ANY($${paramIndex})
        )`;
        taskParams.push(tagsArray);
        paramIndex++;
      }

      // Due date filters
      if (dueDateFrom) {
        taskQuery += ` AND t.due_date >= $${paramIndex++}`;
        taskParams.push(dueDateFrom);
      }
      if (dueDateTo) {
        taskQuery += ` AND t.due_date <= $${paramIndex++}`;
        taskParams.push(dueDateTo);
      }

      // Created by filter
      if (createdBy) {
        taskQuery += ` AND t.created_by = $${paramIndex++}`;
        taskParams.push(createdBy);
      }

      // Created date filters
      if (createdDateFrom) {
        taskQuery += ` AND t.created_at >= $${paramIndex++}`;
        taskParams.push(createdDateFrom);
      }
      if (createdDateTo) {
        taskQuery += ` AND t.created_at <= $${paramIndex++}`;
        taskParams.push(createdDateTo);
      }

      taskQuery += ` ORDER BY t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      taskParams.push(parseInt(perPage), offset);

      const taskResult = await req.app.locals.pool.query(taskQuery, taskParams);
      results.tasks = taskResult.rows;

      // Get assignees for tasks
      if (results.tasks.length > 0) {
        const taskIds = results.tasks.map(t => t.id);
        const assigneesResult = await req.app.locals.pool.query(
          `SELECT ta.task_id, u.id, u.username, u.full_name, u.avatar
           FROM task_assignees ta
           JOIN users u ON ta.user_id = u.id
           WHERE ta.task_id = ANY($1)`,
          [taskIds]
        );

        const assigneesMap = {};
        assigneesResult.rows.forEach(row => {
          if (!assigneesMap[row.task_id]) {
            assigneesMap[row.task_id] = [];
          }
          assigneesMap[row.task_id].push({
            id: row.id,
            username: row.username,
            full_name: row.full_name,
            avatar: row.avatar
          });
        });

        results.tasks = results.tasks.map(task => ({
          ...task,
          assignees: assigneesMap[task.id] || []
        }));
      }
    }

    // Search comments if requested
    if ((type === 'all' || type === 'comments') && (includeComments === 'true' || q)) {
      let commentQuery = `
        SELECT DISTINCT
          c.*,
          t.id as task_id,
          t.title as task_title,
          t.workspace_id,
          u.username,
          u.full_name,
          u.avatar
        FROM comments c
        JOIN tasks t ON c.task_id = t.id
        JOIN users u ON c.author = u.id
        WHERE 1=1
      `;
      const commentParams = [];
      let paramIndex = 1;

      // Workspace filter
      if (workspaceId) {
        commentQuery += ` AND t.workspace_id = $${paramIndex++}`;
        commentParams.push(workspaceId);
      }

      // Text search in comments
      if (q) {
        const searchTerm = `%${q}%`;
        commentQuery += ` AND c.content ILIKE $${paramIndex++}`;
        commentParams.push(searchTerm);
      }

      commentQuery += ` ORDER BY c.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      commentParams.push(parseInt(perPage), offset);

      const commentResult = await req.app.locals.pool.query(commentQuery, commentParams);
      results.comments = commentResult.rows.map(row => ({
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        task: {
          id: row.task_id,
          title: row.task_title,
          workspace_id: row.workspace_id
        },
        author: {
          id: row.author,
          username: row.username,
          full_name: row.full_name,
          avatar: row.avatar
        }
      }));
    }

    // Search lists if requested
    if (type === 'all' || type === 'lists') {
      let listQuery = `
        SELECT l.*, s.name as space_name, w.name as workspace_name
        FROM lists l
        LEFT JOIN spaces s ON l.space_id = s.id
        LEFT JOIN workspaces w ON l.workspace_id = w.id
        WHERE 1=1
      `;
      const listParams = [];
      let paramIndex = 1;

      if (workspaceId) {
        listQuery += ` AND l.workspace_id = $${paramIndex++}`;
        listParams.push(workspaceId);
      }

      if (spaceId) {
        listQuery += ` AND l.space_id = $${paramIndex++}`;
        listParams.push(spaceId);
      }

      if (q) {
        const searchTerm = `%${q}%`;
        listQuery += ` AND l.name ILIKE $${paramIndex++}`;
        listParams.push(searchTerm);
      }

      listQuery += ` ORDER BY l.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      listParams.push(parseInt(perPage), offset);

      const listResult = await req.app.locals.pool.query(listQuery, listParams);
      results.lists = listResult.rows;
    }

    results.total = results.tasks.length + results.comments.length + results.lists.length;

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

