// Permissions middleware
// Check if user has required role in workspace

async function checkWorkspacePermission(req, res, next) {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    const userId = req.user?.id || req.body.userId; // In production, get from JWT
    
    if (!workspaceId || !userId) {
      return res.status(400).json({ message: 'Workspace ID and User ID required' });
    }
    
    // Check if user is owner
    const workspaceResult = await req.app.locals.pool.query(
      'SELECT owner FROM workspaces WHERE id = $1',
      [workspaceId]
    );
    
    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    
    const workspace = workspaceResult.rows[0];
    
    // Owner has all permissions
    if (workspace.owner === parseInt(userId)) {
      req.userRole = 'admin';
      return next();
    }
    
    // Check member role
    const memberResult = await req.app.locals.pool.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );
    
    if (memberResult.rows.length === 0) {
      return res.status(403).json({ message: 'You are not a member of this workspace' });
    }
    
    req.userRole = memberResult.rows[0].role;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin permissions required' });
  }
  next();
}

function requireMember(req, res, next) {
  // Both admin and member can proceed
  if (!req.userRole || (req.userRole !== 'admin' && req.userRole !== 'member')) {
    return res.status(403).json({ message: 'Workspace membership required' });
  }
  next();
}

function requireGuestOrAbove(req, res, next) {
  // Admin, member, and guest can proceed
  if (!req.userRole || (req.userRole !== 'admin' && req.userRole !== 'member' && req.userRole !== 'guest')) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
}

// Check if user can edit tasks
function canEditTask(req, res, next) {
  if (req.userRole === 'admin' || req.userRole === 'member') {
    return next();
  }
  return res.status(403).json({ message: 'You do not have permission to edit tasks' });
}

// Check if user can create workspaces
function canCreateWorkspace(req, res, next) {
  if (req.userRole === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Only admins can create workspaces' });
}

module.exports = {
  checkWorkspacePermission,
  requireAdmin,
  requireMember,
  requireGuestOrAbove,
  canEditTask,
  canCreateWorkspace
};

