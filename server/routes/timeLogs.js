const express = require('express');
const router = express.Router();

// Get time logs for a task
router.get('/task/:taskId', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT tl.*, u.username, u.full_name, u.avatar
       FROM time_logs tl
       LEFT JOIN users u ON tl.user_id = u.id
       WHERE tl.task_id = $1
       ORDER BY tl.start_time DESC`,
      [req.params.taskId]
    );
    
    const logs = rows.map(row => ({
      ...row,
      user: {
        id: row.user_id,
        username: row.username,
        full_name: row.full_name,
        avatar: row.avatar
      }
    }));
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get time logs for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { startDate, endDate, taskId } = req.query;
    let query = `
      SELECT tl.*, t.title as task_title, t.id as task_id
      FROM time_logs tl
      LEFT JOIN tasks t ON tl.task_id = t.id
      WHERE tl.user_id = $1
    `;
    const params = [req.params.userId];
    let paramIndex = 2;
    
    if (startDate) {
      query += ` AND tl.start_time >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND tl.start_time <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    if (taskId) {
      query += ` AND tl.task_id = $${paramIndex++}`;
      params.push(taskId);
    }
    
    query += ` ORDER BY tl.start_time DESC`;
    
    const { rows } = await req.app.locals.pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get aggregated time report
router.get('/report', async (req, res) => {
  try {
    const { workspaceId, userId, listId, startDate, endDate, groupBy } = req.query;
    // groupBy: 'day', 'user', 'task', 'list'
    
    let query = `
      SELECT 
        tl.*,
        t.title as task_title,
        t.list_id,
        l.name as list_name,
        u.username,
        u.full_name
      FROM time_logs tl
      LEFT JOIN tasks t ON tl.task_id = t.id
      LEFT JOIN lists l ON t.list_id = l.id
      LEFT JOIN users u ON tl.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (workspaceId) {
      query += ` AND t.workspace_id = $${paramIndex++}`;
      params.push(workspaceId);
    }
    
    if (userId) {
      query += ` AND tl.user_id = $${paramIndex++}`;
      params.push(userId);
    }
    
    if (listId) {
      query += ` AND t.list_id = $${paramIndex++}`;
      params.push(listId);
    }
    
    if (startDate) {
      query += ` AND tl.start_time >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND tl.start_time <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    const { rows } = await req.app.locals.pool.query(query, params);
    
    // Aggregate based on groupBy
    let aggregated = {};
    
    if (groupBy === 'day') {
      rows.forEach(row => {
        const date = new Date(row.start_time).toISOString().split('T')[0];
        if (!aggregated[date]) {
          aggregated[date] = { date, totalSeconds: 0, count: 0 };
        }
        aggregated[date].totalSeconds += row.duration;
        aggregated[date].count += 1;
      });
    } else if (groupBy === 'user') {
      rows.forEach(row => {
        const key = row.user_id;
        if (!aggregated[key]) {
          aggregated[key] = {
            user_id: row.user_id,
            username: row.username,
            full_name: row.full_name,
            totalSeconds: 0,
            count: 0
          };
        }
        aggregated[key].totalSeconds += row.duration;
        aggregated[key].count += 1;
      });
    } else if (groupBy === 'task') {
      rows.forEach(row => {
        const key = row.task_id;
        if (!aggregated[key]) {
          aggregated[key] = {
            task_id: row.task_id,
            task_title: row.task_title,
            totalSeconds: 0,
            count: 0
          };
        }
        aggregated[key].totalSeconds += row.duration;
        aggregated[key].count += 1;
      });
    } else {
      // Default: return all logs
      return res.json(rows);
    }
    
    // Convert to array and format
    const result = Object.values(aggregated).map(item => ({
      ...item,
      totalHours: (item.totalSeconds / 3600).toFixed(2),
      totalMinutes: (item.totalSeconds / 60).toFixed(2)
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create time log
router.post('/', async (req, res) => {
  try {
    const { taskId, userId, duration, startTime, endTime, description, billable } = req.body;
    
    if (!taskId || !userId || !duration) {
      return res.status(400).json({ message: 'Task ID, user ID, and duration are required' });
    }
    
    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO time_logs (task_id, user_id, duration, start_time, end_time, description, billable)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [taskId, userId, duration, startTime || null, endTime || null, description || null, billable || false]
    );
    
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update time log
router.put('/:id', async (req, res) => {
  try {
    const { duration, startTime, endTime, description, billable } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (duration !== undefined) {
      updates.push(`duration = $${paramIndex++}`);
      values.push(duration);
    }
    if (startTime !== undefined) {
      updates.push(`start_time = $${paramIndex++}`);
      values.push(startTime);
    }
    if (endTime !== undefined) {
      updates.push(`end_time = $${paramIndex++}`);
      values.push(endTime);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (billable !== undefined) {
      updates.push(`billable = $${paramIndex++}`);
      values.push(billable);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);
    
    const { rows } = await req.app.locals.pool.query(
      `UPDATE time_logs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Time log not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete time log
router.delete('/:id', async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM time_logs WHERE id = $1', [req.params.id]);
    res.json({ message: 'Time log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

