const express = require('express');
const router = express.Router();

// Get all notifications for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    let query = `
      SELECT n.*, 
             u.id as from_user_id, u.username as from_username, u.full_name as from_full_name, u.avatar as from_avatar
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      WHERE n.user_id = $1
    `;
    
    const params = [req.params.userId];
    
    if (unreadOnly === 'true') {
      query += ' AND n.read = FALSE';
    }
    
    query += ' ORDER BY n.created_at DESC LIMIT 100';
    
    const { rows } = await req.app.locals.pool.query(query, params);
    
    const notifications = rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      message: row.message,
      related_id: row.related_id,
      related_type: row.related_type,
      read: row.read,
      created_at: row.created_at,
      from_user: row.from_user_id ? {
        id: row.from_user_id,
        username: row.from_username,
        full_name: row.from_full_name,
        avatar: row.from_avatar
      } : null
    }));
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unread count for a user
router.get('/user/:userId/unread-count', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [req.params.userId]
    );
    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      'UPDATE notifications SET read = TRUE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark all notifications as read for a user
router.patch('/user/:userId/read-all', async (req, res) => {
  try {
    await req.app.locals.pool.query(
      'UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE',
      [req.params.userId]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

