const express = require('express');
const router = express.Router();

// Get all automations for a workspace
router.get('/workspace/:workspaceId', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT a.*, u.username as created_by_name
       FROM automations a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.workspace_id = $1
       ORDER BY a.created_at DESC`,
      [req.params.workspaceId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single automation
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      'SELECT * FROM automations WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Automation not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create automation
router.post('/', async (req, res) => {
  try {
    const { workspaceId, name, triggerType, triggerConditions, actionType, actionData, createdBy, 
            scheduleType, scheduleConfig, listId, spaceId } = req.body;
    
    if (!workspaceId || !name || !triggerType || !actionType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Calculate next_run_at for recurring automations
    let nextRunAt = null;
    if (scheduleType && scheduleType !== 'none') {
      const AutomationEngine = require('../services/automationEngine');
      const tempEngine = new AutomationEngine(req.app.locals.pool, null);
      nextRunAt = tempEngine.calculateNextRun(scheduleType, scheduleConfig || {});
    }

    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO automations (workspace_id, name, trigger_type, trigger_conditions, action_type, action_data, 
                                created_by, schedule_type, schedule_config, list_id, space_id, next_run_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        workspaceId,
        name,
        triggerType,
        JSON.stringify(triggerConditions || {}),
        actionType,
        JSON.stringify(actionData || {}),
        createdBy,
        scheduleType || null,
        JSON.stringify(scheduleConfig || {}),
        listId || null,
        spaceId || null,
        nextRunAt
      ]
    );
    
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update automation
router.put('/:id', async (req, res) => {
  try {
    const { name, triggerType, triggerConditions, actionType, actionData, enabled, 
            scheduleType, scheduleConfig, listId, spaceId } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (triggerType !== undefined) {
      updates.push(`trigger_type = $${paramIndex}`);
      values.push(triggerType);
      paramIndex++;
    }
    if (triggerConditions !== undefined) {
      updates.push(`trigger_conditions = $${paramIndex}`);
      values.push(JSON.stringify(triggerConditions));
      paramIndex++;
    }
    if (actionType !== undefined) {
      updates.push(`action_type = $${paramIndex}`);
      values.push(actionType);
      paramIndex++;
    }
    if (actionData !== undefined) {
      updates.push(`action_data = $${paramIndex}`);
      values.push(JSON.stringify(actionData));
      paramIndex++;
    }
    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex}`);
      values.push(enabled);
      paramIndex++;
    }
    if (scheduleType !== undefined) {
      updates.push(`schedule_type = $${paramIndex}`);
      values.push(scheduleType || null);
      paramIndex++;
    }
    if (scheduleConfig !== undefined) {
      updates.push(`schedule_config = $${paramIndex}`);
      values.push(JSON.stringify(scheduleConfig || {}));
      paramIndex++;
    }
    if (listId !== undefined) {
      updates.push(`list_id = $${paramIndex}`);
      values.push(listId || null);
      paramIndex++;
    }
    if (spaceId !== undefined) {
      updates.push(`space_id = $${paramIndex}`);
      values.push(spaceId || null);
      paramIndex++;
    }

    // Recalculate next_run_at if schedule changed
    if (scheduleType !== undefined && scheduleType && scheduleType !== 'none') {
      const AutomationEngine = require('../services/automationEngine');
      const tempEngine = new AutomationEngine(req.app.locals.pool, null);
      const nextRunAt = tempEngine.calculateNextRun(scheduleType, scheduleConfig || {});
      updates.push(`next_run_at = $${paramIndex}`);
      values.push(nextRunAt);
      paramIndex++;
    } else if (scheduleType === 'none' || scheduleType === null) {
      updates.push(`next_run_at = NULL`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);

    const query = `UPDATE automations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const { rows } = await req.app.locals.pool.query(query, values);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Automation not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete automation
router.delete('/:id', async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM automations WHERE id = $1', [req.params.id]);
    res.json({ message: 'Automation deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle automation enabled/disabled
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      'UPDATE automations SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Automation not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

