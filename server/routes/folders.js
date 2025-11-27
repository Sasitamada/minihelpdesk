const express = require('express');
const router = express.Router();

// Get folders for a space
router.get('/space/:spaceId', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      'SELECT * FROM folders WHERE space_id = $1 ORDER BY created_at ASC',
      [req.params.spaceId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create folder
router.post('/', async (req, res) => {
  try {
    const { spaceId, name, description, color, createdBy } = req.body;
    if (!spaceId || !name) {
      return res.status(400).json({ message: 'Space ID and name are required' });
    }

    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO folders (space_id, name, description, color, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [spaceId, name.trim(), description || null, color || '#6b5ce6', createdBy || null]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update folder
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color } = req.body;
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

    if (!updates.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);

    const { rows } = await req.app.locals.pool.query(
      `UPDATE folders SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete folder
router.delete('/:id', async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);

    // Detach lists from folder
    await req.app.locals.pool.query(
      'UPDATE projects SET folder_id = NULL WHERE folder_id = $1',
      [folderId]
    );

    await req.app.locals.pool.query('DELETE FROM folders WHERE id = $1', [folderId]);

    res.json({ message: 'Folder deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

