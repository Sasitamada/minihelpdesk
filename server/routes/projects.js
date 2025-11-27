const express = require('express');
const router = express.Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      'SELECT * FROM projects ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get projects by workspace
router.get('/workspace/:workspaceId', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      'SELECT * FROM projects WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.params.workspaceId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT p.*, s.name AS space_name, f.name AS folder_name, w.name AS workspace_name
       FROM projects p
       LEFT JOIN spaces s ON p.space_id = s.id
       LEFT JOIN folders f ON p.folder_id = f.id
       LEFT JOIN workspaces w ON p.workspace_id = w.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Project not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create project (List)
router.post('/', async (req, res) => {
  try {
    const { name, description, workspace, owner, color, spaceId, folderId } = req.body;
    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO projects (name, description, workspace_id, owner, color, space_id, folder_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, workspace, owner, color || '#4a9eff', spaceId || null, folderId || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color, spaceId, folderId } = req.body;
    const updates = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      updates.push(`name = $${index++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }
    if (color !== undefined) {
      updates.push(`color = $${index++}`);
      values.push(color);
    }
    if (spaceId !== undefined) {
      updates.push(`space_id = $${index++}`);
      values.push(spaceId);
    }
    if (folderId !== undefined) {
      updates.push(`folder_id = $${index++}`);
      values.push(folderId);
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);

    const { rows } = await req.app.locals.pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;