const express = require('express');
const router = express.Router();

// Get all lists for a workspace (with hierarchy info)
router.get('/workspace/:workspaceId', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT l.*, 
              s.name AS space_name, 
              f.name AS folder_name,
              (SELECT COUNT(*) FROM tasks WHERE list_id = l.id) AS task_count
       FROM lists l
       LEFT JOIN spaces s ON l.space_id = s.id
       LEFT JOIN folders f ON l.folder_id = f.id
       WHERE l.workspace_id = $1
       ORDER BY l.position ASC, l.created_at ASC`,
      [req.params.workspaceId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get lists for a folder
router.get('/folder/:folderId', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT l.*,
              (SELECT COUNT(*) FROM tasks WHERE list_id = l.id) AS task_count
       FROM lists l
       WHERE l.folder_id = $1
       ORDER BY l.position ASC, l.created_at ASC`,
      [req.params.folderId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get lists for a space (not in a folder)
router.get('/space/:spaceId', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT l.*,
              (SELECT COUNT(*) FROM tasks WHERE list_id = l.id) AS task_count
       FROM lists l
       WHERE l.space_id = $1 AND l.folder_id IS NULL
       ORDER BY l.position ASC, l.created_at ASC`,
      [req.params.spaceId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single list with full details
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT l.*, 
              s.name AS space_name, 
              s.id AS space_id,
              f.name AS folder_name,
              f.id AS folder_id,
              w.name AS workspace_name,
              (SELECT COUNT(*) FROM tasks WHERE list_id = l.id) AS task_count
       FROM lists l
       LEFT JOIN spaces s ON l.space_id = s.id
       LEFT JOIN folders f ON l.folder_id = f.id
       LEFT JOIN workspaces w ON l.workspace_id = w.id
       WHERE l.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'List not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new list
router.post('/', async (req, res) => {
  try {
    const { name, description, workspaceId, spaceId, folderId, color, owner, position } = req.body;
    
    if (!name || !workspaceId) {
      return res.status(400).json({ message: 'Name and workspace ID are required' });
    }

    // Get next position if not provided
    let finalPosition = position;
    if (finalPosition === undefined || finalPosition === null) {
      const positionResult = await req.app.locals.pool.query(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next_position
         FROM lists
         WHERE workspace_id = $1 AND 
               ((folder_id IS NULL AND $2::integer IS NULL) OR folder_id = $2) AND
               ((space_id IS NULL AND $3::integer IS NULL) OR space_id = $3)`,
        [workspaceId, folderId || null, spaceId || null]
      );
      finalPosition = positionResult.rows[0].next_position;
    }

    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO lists (name, description, workspace_id, space_id, folder_id, color, owner, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name.trim(),
        description || null,
        workspaceId,
        spaceId || null,
        folderId || null,
        color || '#4a9eff',
        owner || null,
        finalPosition
      ]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating list:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update list
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color, spaceId, folderId, position } = req.body;
    const updates = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      updates.push(`name = $${index++}`);
      values.push(name.trim());
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
      values.push(spaceId || null);
    }
    if (folderId !== undefined) {
      updates.push(`folder_id = $${index++}`);
      values.push(folderId || null);
    }
    if (position !== undefined) {
      updates.push(`position = $${index++}`);
      values.push(position);
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);

    const { rows } = await req.app.locals.pool.query(
      `UPDATE lists SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'List not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete list
router.delete('/:id', async (req, res) => {
  try {
    const listId = parseInt(req.params.id, 10);

    // Check if list has tasks
    const taskCount = await req.app.locals.pool.query(
      'SELECT COUNT(*) FROM tasks WHERE list_id = $1',
      [listId]
    );

    if (parseInt(taskCount.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete list with tasks. Please move or delete tasks first.' 
      });
    }

    await req.app.locals.pool.query('DELETE FROM lists WHERE id = $1', [listId]);

    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reorder lists (bulk update positions)
router.patch('/reorder', async (req, res) => {
  try {
    const { listOrders } = req.body; // Array of { id, position }

    if (!Array.isArray(listOrders)) {
      return res.status(400).json({ message: 'listOrders must be an array' });
    }

    const client = await req.app.locals.pool.connect();
    try {
      await client.query('BEGIN');

      for (const { id, position } of listOrders) {
        await client.query(
          'UPDATE lists SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [position, id]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Lists reordered successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

