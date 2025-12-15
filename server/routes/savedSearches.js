const express = require('express');
const router = express.Router();

// Get all saved searches for current user
router.get('/', async (req, res) => {
  try {
    const { userId, workspaceId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    let query = `
      SELECT * FROM saved_searches
      WHERE user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (workspaceId) {
      query += ` AND (workspace_id = $${paramIndex} OR scope = 'global')`;
      params.push(workspaceId);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const { rows } = await req.app.locals.pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single saved search
router.get('/:id', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const { rows } = await req.app.locals.pool.query(
      `SELECT * FROM saved_searches
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Saved search not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a saved search
router.post('/', async (req, res) => {
  try {
    const { userId, workspaceId, name, queryText, filterConfig, scope, scopeId } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ message: 'User ID and name are required' });
    }

    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO saved_searches (user_id, workspace_id, name, query_text, filter_config, scope, scope_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        workspaceId || null,
        name,
        queryText || null,
        JSON.stringify(filterConfig || {}),
        scope || 'workspace',
        scopeId || null
      ]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a saved search
router.patch('/:id', async (req, res) => {
  try {
    const { userId, name, queryText, filterConfig, scope, scopeId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (queryText !== undefined) {
      updates.push(`query_text = $${paramIndex++}`);
      values.push(queryText);
    }
    if (filterConfig !== undefined) {
      updates.push(`filter_config = $${paramIndex++}`);
      values.push(JSON.stringify(filterConfig));
    }
    if (scope !== undefined) {
      updates.push(`scope = $${paramIndex++}`);
      values.push(scope);
    }
    if (scopeId !== undefined) {
      updates.push(`scope_id = $${paramIndex++}`);
      values.push(scopeId);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);
    values.push(userId);
    paramIndex += 2;

    const { rows } = await req.app.locals.pool.query(
      `UPDATE saved_searches SET ${updates.join(', ')} WHERE id = $${paramIndex - 1} AND user_id = $${paramIndex} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Saved search not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a saved search
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const { rowCount } = await req.app.locals.pool.query(
      'DELETE FROM saved_searches WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Saved search not found' });
    }

    res.json({ message: 'Saved search deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

