const express = require('express');
const router = express.Router();

// Helper to ensure at least one default space exists
async function ensureDefaultSpace(pool, workspaceId) {
  const { rows } = await pool.query(
    'SELECT * FROM spaces WHERE workspace_id = $1 ORDER BY created_at ASC',
    [workspaceId]
  );

  if (rows.length > 0) {
    return rows;
  }

  const defaultSpace = await pool.query(
    `INSERT INTO spaces (workspace_id, name, color)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [workspaceId, 'General Space', '#ffb347']
  );

  return defaultSpace.rows;
}

// Get spaces (with folders and lists) for a workspace
router.get('/workspace/:workspaceId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const pool = req.app.locals.pool;

    let spaces = await ensureDefaultSpace(pool, workspaceId);
    const spaceIds = spaces.map(space => space.id);

    let folders = [];
    if (spaceIds.length > 0) {
      const foldersResult = await pool.query(
        'SELECT * FROM folders WHERE space_id = ANY($1::int[]) ORDER BY created_at ASC',
        [spaceIds]
      );
      folders = foldersResult.rows;
    }

    // Get lists from the lists table (ClickUp-style hierarchy)
    const listsResult = await pool.query(
      'SELECT * FROM lists WHERE workspace_id = $1 ORDER BY position ASC, created_at ASC',
      [workspaceId]
    );
    const lists = listsResult.rows;

    // Build structure
    const spaceMap = {};
    spaces.forEach(space => {
      spaceMap[space.id] = {
        ...space,
        folders: [],
        lists: []
      };
    });

    const folderMap = {};
    folders.forEach(folder => {
      const enriched = { ...folder, lists: [] };
      folderMap[folder.id] = enriched;
      if (spaceMap[folder.space_id]) {
        spaceMap[folder.space_id].folders.push(enriched);
      }
    });

    lists.forEach(list => {
      const targetSpaceId = list.space_id || spaces[0]?.id;
      if (list.folder_id && folderMap[list.folder_id]) {
        folderMap[list.folder_id].lists.push(list);
      } else if (targetSpaceId && spaceMap[targetSpaceId]) {
        spaceMap[targetSpaceId].lists.push(list);
      } else if (spaces[0]) {
        // Fallback: assign to first space
        spaceMap[spaces[0].id].lists.push(list);
      }
    });

    res.json(Object.values(spaceMap));
  } catch (error) {
    console.error('Error fetching spaces:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create new space
router.post('/', async (req, res) => {
  try {
    const { workspaceId, name, description, color, icon, createdBy } = req.body;
    if (!workspaceId || !name) {
      return res.status(400).json({ message: 'Workspace ID and name are required' });
    }

    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO spaces (workspace_id, name, description, color, icon, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [workspaceId, name.trim(), description || null, color || '#ff6b6b', icon || null, createdBy || null]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update space
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
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
    if (icon !== undefined) {
      updates.push(`icon = $${index++}`);
      values.push(icon);
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);

    const { rows } = await req.app.locals.pool.query(
      `UPDATE spaces SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Space not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete space
router.delete('/:id', async (req, res) => {
  try {
    const spaceId = parseInt(req.params.id, 10);

    // Set lists referencing this space to null
    await req.app.locals.pool.query(
      'UPDATE projects SET space_id = NULL, folder_id = NULL WHERE space_id = $1',
      [spaceId]
    );

    await req.app.locals.pool.query('DELETE FROM spaces WHERE id = $1', [spaceId]);

    res.json({ message: 'Space deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

