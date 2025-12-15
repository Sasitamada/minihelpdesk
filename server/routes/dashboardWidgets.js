const express = require('express');
const router = express.Router();

// Get dashboard widgets for user/workspace
router.get('/user/:userId/workspace/:workspaceId', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT * FROM dashboard_widgets
       WHERE user_id = $1 AND workspace_id = $2
       ORDER BY position ASC`,
      [req.params.userId, req.params.workspaceId]
    );
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save dashboard widget
router.post('/', async (req, res) => {
  try {
    const { userId, workspaceId, widgetType, widgetConfig, position, visible } = req.body;
    
    if (!userId || !workspaceId || !widgetType) {
      return res.status(400).json({ message: 'User ID, workspace ID, and widget type are required' });
    }
    
    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO dashboard_widgets (user_id, workspace_id, widget_type, widget_config, position, visible)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, workspace_id, widget_type)
       DO UPDATE SET widget_config = $4, position = $5, visible = $6, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        userId,
        workspaceId,
        widgetType,
        JSON.stringify(widgetConfig || {}),
        position || 0,
        visible !== undefined ? visible : true
      ]
    );
    
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update dashboard widget
router.put('/:id', async (req, res) => {
  try {
    const { widgetConfig, position, visible } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (widgetConfig !== undefined) {
      updates.push(`widget_config = $${paramIndex++}`);
      values.push(JSON.stringify(widgetConfig));
    }
    
    if (position !== undefined) {
      updates.push(`position = $${paramIndex++}`);
      values.push(position);
    }
    
    if (visible !== undefined) {
      updates.push(`visible = $${paramIndex++}`);
      values.push(visible);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);
    
    const { rows } = await req.app.locals.pool.query(
      `UPDATE dashboard_widgets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Widget not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk update widget positions
router.patch('/reorder', async (req, res) => {
  try {
    const { widgetOrders } = req.body; // Array of { id, position }
    
    if (!Array.isArray(widgetOrders)) {
      return res.status(400).json({ message: 'widgetOrders must be an array' });
    }
    
    const client = await req.app.locals.pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const { id, position } of widgetOrders) {
        await client.query(
          'UPDATE dashboard_widgets SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [position, id]
        );
      }
      
      await client.query('COMMIT');
      res.json({ message: 'Widgets reordered successfully' });
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

// Delete dashboard widget
router.delete('/:id', async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM dashboard_widgets WHERE id = $1', [req.params.id]);
    res.json({ message: 'Widget deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

