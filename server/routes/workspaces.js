const express = require('express');
const router = express.Router();
const { checkWorkspacePermission, requireAdmin, canCreateWorkspace } = require('../middleware/permissions');

// Get all workspaces
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all workspaces');
    const { rows } = await req.app.locals.pool.query('SELECT * FROM workspaces ORDER BY created_at DESC');
    console.log(`Found ${rows.length} workspaces`);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single workspace with members
router.get('/:id', async (req, res) => {
  try {
    const workspaceResult = await req.app.locals.pool.query('SELECT * FROM workspaces WHERE id = $1', [req.params.id]);
    if (workspaceResult.rows.length === 0) return res.status(404).json({ message: 'Workspace not found' });
    
    const workspace = workspaceResult.rows[0];
    
    // Get members
    const membersResult = await req.app.locals.pool.query(
      `SELECT wm.*, u.id as user_id, u.username, u.email, u.full_name, u.avatar
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = $1
       ORDER BY wm.joined_at`,
      [req.params.id]
    );
    
    // Get owner info
    let ownerInfo = null;
    if (workspace.owner) {
      const ownerResult = await req.app.locals.pool.query(
        'SELECT id, username, email, full_name, avatar FROM users WHERE id = $1',
        [workspace.owner]
      );
      ownerInfo = ownerResult.rows[0];
    }
    
    res.json({
      ...workspace,
      members: membersResult.rows,
      ownerInfo
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get workspace members
router.get('/:id/members', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT wm.*, u.id as user_id, u.username, u.email, u.full_name, u.avatar
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = $1
       ORDER BY wm.joined_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add member to workspace
router.post('/:id/members', async (req, res) => {
  try {
    const { userId, role = 'member' } = req.body;
    const result = await req.app.locals.pool.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, userId, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove member from workspace
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    await req.app.locals.pool.query(
      'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update member role
router.put('/:id/members/:userId', async (req, res) => {
  try {
    const { role } = req.body;
    const result = await req.app.locals.pool.query(
      'UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3 RETURNING *',
      [role, req.params.id, req.params.userId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

async function createWorkspace(req, res) {
  try {
    console.log('Creating workspace with data:', req.body);
    const { name, description, color, owner } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Workspace name is required' });
    }

    const { rows } = await req.app.locals.pool.query(
      'INSERT INTO workspaces (name, description, color, owner) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), description?.trim() || null, color || '#7b68ee', owner || null]
    );

    console.log('Workspace created successfully:', rows[0]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(400).json({ message: error.message || 'Failed to create workspace' });
  }
}

router.post('/', createWorkspace);
router.post('/open', createWorkspace);

// Update workspace
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const { rows } = await req.app.locals.pool.query(
      'UPDATE workspaces SET name = $1, description = $2, color = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, description, color, req.params.id]
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete workspace
router.delete('/:id', async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM workspaces WHERE id = $1', [req.params.id]);
    res.json({ message: 'Workspace deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;