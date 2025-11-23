const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Generate shareable link
router.post('/generate', async (req, res) => {
  try {
    const { resourceType, resourceId, expiresIn, accessLevel = 'view', userId } = req.body;
    
    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
    }
    
    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO shareable_links (token, resource_type, resource_id, created_by, expires_at, access_level)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [token, resourceType, resourceId, userId, expiresAt, accessLevel]
    );
    
    const shareableLink = rows[0];
    const shareUrl = `${req.protocol}://${req.get('host')}/share/${token}`;
    
    res.json({
      ...shareableLink,
      shareUrl
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get shareable link by token
router.get('/:token', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      'SELECT * FROM shareable_links WHERE token = $1',
      [req.params.token]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Share link not found or expired' });
    }
    
    const link = rows[0];
    
    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ message: 'Share link has expired' });
    }
    
    // Get resource based on type
    let resource = null;
    if (link.resource_type === 'task') {
      const taskResult = await req.app.locals.pool.query(
        'SELECT * FROM tasks WHERE id = $1',
        [link.resource_id]
      );
      resource = taskResult.rows[0];
    } else if (link.resource_type === 'project') {
      const projectResult = await req.app.locals.pool.query(
        'SELECT * FROM projects WHERE id = $1',
        [link.resource_id]
      );
      resource = projectResult.rows[0];
    }
    
    res.json({
      link,
      resource
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// List all shareable links for a resource
router.get('/resource/:type/:id', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT * FROM shareable_links 
       WHERE resource_type = $1 AND resource_id = $2
       ORDER BY created_at DESC`,
      [req.params.type, req.params.id]
    );
    
    const links = rows.map(link => ({
      ...link,
      shareUrl: `${req.protocol}://${req.get('host')}/share/${link.token}`
    }));
    
    res.json(links);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Revoke shareable link
router.delete('/:token', async (req, res) => {
  try {
    await req.app.locals.pool.query(
      'DELETE FROM shareable_links WHERE token = $1',
      [req.params.token]
    );
    res.json({ message: 'Share link revoked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

