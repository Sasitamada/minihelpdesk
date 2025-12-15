const express = require('express');
const router = express.Router();

// Get all docs for a workspace (or global if workspaceId is null)
router.get('/workspace/:workspaceId', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT d.*, u.id as user_id, u.username, u.full_name, u.avatar
       FROM docs d
       LEFT JOIN users u ON d.created_by = u.id
       WHERE d.workspace_id = $1 OR (d.workspace_id IS NULL AND $1 IS NULL)
       ORDER BY d.updated_at DESC`,
      [req.params.workspaceId === 'null' ? null : req.params.workspaceId]
    );
    
    const docs = rows.map(row => ({
      ...row,
      author: {
        id: row.user_id,
        username: row.username,
        full_name: row.full_name,
        avatar: row.avatar
      }
    }));
    
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single doc
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT d.*, u.id as user_id, u.username, u.full_name, u.avatar
       FROM docs d
       LEFT JOIN users u ON d.created_by = u.id
       WHERE d.id = $1`,
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Doc not found' });
    }
    
    const doc = rows[0];
    res.json({
      ...doc,
      author: {
        id: doc.user_id,
        username: doc.username,
        full_name: doc.full_name,
        avatar: doc.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create doc
router.post('/', async (req, res) => {
  try {
    const { title, content, workspace_id, space_id, created_by } = req.body;
    
    if (!title || !created_by) {
      return res.status(400).json({ message: 'Title and created_by are required' });
    }
    
    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO docs (title, content, workspace_id, space_id, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, content || '', workspace_id || null, space_id || null, created_by]
    );
    
    const doc = rows[0];
    
    // Get author info
    const authorResult = await req.app.locals.pool.query(
      'SELECT id, username, full_name, avatar FROM users WHERE id = $1',
      [created_by]
    );
    
    res.status(201).json({
      ...doc,
      author: authorResult.rows[0] || { id: created_by }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update doc
router.put('/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);
    
    const { rows } = await req.app.locals.pool.query(
      `UPDATE docs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Doc not found' });
    }
    
    const doc = rows[0];
    
    // Get author info
    const authorResult = await req.app.locals.pool.query(
      'SELECT id, username, full_name, avatar FROM users WHERE id = $1',
      [doc.created_by]
    );
    
    res.json({
      ...doc,
      author: authorResult.rows[0] || { id: doc.created_by }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete doc
router.delete('/:id', async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM docs WHERE id = $1', [req.params.id]);
    res.json({ message: 'Doc deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

