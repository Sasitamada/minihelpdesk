const express = require('express');
const router = express.Router();

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const { workspaceId, listId, spaceId, startDate, endDate } = req.query;
    
    let taskQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status != 'done') as open_tasks,
        COUNT(*) FILTER (WHERE status = 'done') as completed_tasks,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'done') as overdue_tasks,
        COUNT(*) as total_tasks
      FROM tasks t
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (workspaceId) {
      taskQuery += ` AND t.workspace_id = $${paramIndex++}`;
      params.push(workspaceId);
    }
    
    if (listId) {
      taskQuery += ` AND t.list_id = $${paramIndex++}`;
      params.push(listId);
    }
    
    if (spaceId) {
      taskQuery += ` AND EXISTS (
        SELECT 1 FROM lists l WHERE l.id = t.list_id AND l.space_id = $${paramIndex}
      )`;
      params.push(spaceId);
      paramIndex++;
    }
    
    if (startDate) {
      taskQuery += ` AND t.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      taskQuery += ` AND t.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    const statsResult = await req.app.locals.pool.query(taskQuery, params);
    const stats = statsResult.rows[0];
    
    // Status breakdown
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM tasks t
      WHERE 1=1
      ${workspaceId ? `AND t.workspace_id = $${paramIndex++}` : ''}
      ${listId ? `AND t.list_id = $${paramIndex++}` : ''}
      GROUP BY status
    `;
    const statusParams = [];
    if (workspaceId) statusParams.push(workspaceId);
    if (listId) statusParams.push(listId);
    const statusResult = await req.app.locals.pool.query(statusQuery, statusParams);
    
    // Priority breakdown
    const priorityQuery = `
      SELECT priority, COUNT(*) as count
      FROM tasks t
      WHERE 1=1
      ${workspaceId ? `AND t.workspace_id = $${paramIndex++}` : ''}
      ${listId ? `AND t.list_id = $${paramIndex++}` : ''}
      GROUP BY priority
    `;
    const priorityParams = [];
    if (workspaceId) priorityParams.push(workspaceId);
    if (listId) priorityParams.push(listId);
    const priorityResult = await req.app.locals.pool.query(priorityQuery, priorityParams);
    
    res.json({
      stats: {
        openTasks: parseInt(stats.open_tasks || 0),
        completedTasks: parseInt(stats.completed_tasks || 0),
        overdueTasks: parseInt(stats.overdue_tasks || 0),
        totalTasks: parseInt(stats.total_tasks || 0)
      },
      statusBreakdown: statusResult.rows,
      priorityBreakdown: priorityResult.rows
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get workload report
router.get('/workload', async (req, res) => {
  try {
    const { workspaceId, startDate, endDate } = req.query;
    
    // Get all workspace members
    const membersResult = await req.app.locals.pool.query(
      `SELECT wm.user_id, u.username, u.full_name, u.avatar
       FROM workspace_members wm
       LEFT JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = $1`,
      [workspaceId]
    );
    
    const workload = await Promise.all(
      membersResult.rows.map(async (member) => {
        let taskQuery = `
          SELECT COUNT(*) as task_count
          FROM tasks t
          INNER JOIN task_assignees ta ON t.id = ta.task_id
          WHERE ta.user_id = $1 AND t.workspace_id = $2
        `;
        const params = [member.user_id, workspaceId];
        let paramIndex = 3;
        
        if (startDate) {
          taskQuery += ` AND t.due_date >= $${paramIndex++}`;
          params.push(startDate);
        }
        
        if (endDate) {
          taskQuery += ` AND t.due_date <= $${paramIndex++}`;
          params.push(endDate);
        }
        
        const taskResult = await req.app.locals.pool.query(taskQuery, params);
        const taskCount = parseInt(taskResult.rows[0].task_count || 0);
        
        // Get overdue tasks
        const overdueResult = await req.app.locals.pool.query(
          `SELECT COUNT(*) as overdue_count
           FROM tasks t
           INNER JOIN task_assignees ta ON t.id = ta.task_id
           WHERE ta.user_id = $1 
           AND t.workspace_id = $2
           AND t.due_date < NOW()
           AND t.status != 'done'`,
          [member.user_id, workspaceId]
        );
        const overdueCount = parseInt(overdueResult.rows[0].overdue_count || 0);
        
        // Get time tracked (if available)
        const timeResult = await req.app.locals.pool.query(
          `SELECT COALESCE(SUM(duration), 0) as total_seconds
           FROM time_logs tl
           INNER JOIN tasks t ON tl.task_id = t.id
           WHERE tl.user_id = $1 
           AND t.workspace_id = $2
           ${startDate ? `AND tl.start_time >= $3` : ''}
           ${endDate ? `AND tl.start_time <= $${startDate ? '4' : '3'}` : ''}`,
          startDate && endDate 
            ? [member.user_id, workspaceId, startDate, endDate]
            : startDate
            ? [member.user_id, workspaceId, startDate]
            : [member.user_id, workspaceId]
        );
        const totalSeconds = parseInt(timeResult.rows[0].total_seconds || 0);
        
        return {
          user: {
            id: member.user_id,
            username: member.username,
            full_name: member.full_name,
            avatar: member.avatar
          },
          taskCount,
          overdueCount,
          totalHours: (totalSeconds / 3600).toFixed(2),
          utilization: taskCount > 10 ? 'high' : taskCount > 5 ? 'medium' : 'low'
        };
      })
    );
    
    res.json(workload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get activity feed
router.get('/activity', async (req, res) => {
  try {
    const { workspaceId, listId, userId, eventType, startDate, endDate, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        th.*,
        u.username,
        u.full_name,
        u.avatar,
        t.title as task_title,
        t.id as task_id
      FROM task_history th
      LEFT JOIN users u ON th.user_id = u.id
      LEFT JOIN tasks t ON th.task_id = t.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (workspaceId) {
      query += ` AND t.workspace_id = $${paramIndex++}`;
      params.push(workspaceId);
    }
    
    if (listId) {
      query += ` AND t.list_id = $${paramIndex++}`;
      params.push(listId);
    }
    
    if (userId) {
      query += ` AND th.user_id = $${paramIndex++}`;
      params.push(userId);
    }
    
    if (eventType) {
      query += ` AND th.action = $${paramIndex++}`;
      params.push(eventType);
    }
    
    if (startDate) {
      query += ` AND th.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND th.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    query += ` ORDER BY th.created_at DESC LIMIT $${paramIndex++}`;
    params.push(parseInt(limit));
    
    const { rows } = await req.app.locals.pool.query(query, params);
    
    const activities = rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      taskTitle: row.task_title,
      userId: row.user_id,
      userName: row.full_name || row.username,
      userAvatar: row.avatar,
      action: row.action,
      fieldName: row.field_name,
      oldValue: row.old_value,
      newValue: row.new_value,
      createdAt: row.created_at
    }));
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get sprint report
router.get('/sprint', async (req, res) => {
  try {
    const { workspaceId, sprintId, listId, startDate, endDate } = req.query;
    
    let taskQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'done') as completed,
        COUNT(*) FILTER (WHERE status = 'inprogress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'todo') as not_started,
        COUNT(*) as total
      FROM tasks t
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (workspaceId) {
      taskQuery += ` AND t.workspace_id = $${paramIndex++}`;
      params.push(workspaceId);
    }
    
    if (listId) {
      taskQuery += ` AND t.list_id = $${paramIndex++}`;
      params.push(listId);
    }
    
    if (sprintId) {
      // Get sprint's list_id
      const sprintResult = await req.app.locals.pool.query(
        'SELECT list_id FROM sprints WHERE id = $1',
        [sprintId]
      );
      if (sprintResult.rows.length > 0 && sprintResult.rows[0].list_id) {
        taskQuery += ` AND t.list_id = $${paramIndex++}`;
        params.push(sprintResult.rows[0].list_id);
      }
    }
    
    if (startDate) {
      taskQuery += ` AND t.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      taskQuery += ` AND t.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    const result = await req.app.locals.pool.query(taskQuery, params);
    const stats = result.rows[0];
    
    // Calculate velocity (tasks completed per day)
    let velocityQuery = `
      SELECT COUNT(*) as completed_count
      FROM tasks t
      WHERE t.status = 'done'
    `;
    const velocityParams = [];
    let velParamIndex = 1;
    
    if (workspaceId) {
      velocityQuery += ` AND t.workspace_id = $${velParamIndex++}`;
      velocityParams.push(workspaceId);
    }
    
    if (listId) {
      velocityQuery += ` AND t.list_id = $${velParamIndex++}`;
      velocityParams.push(listId);
    }
    
    if (startDate && endDate) {
      velocityQuery += ` AND t.updated_at >= $${velParamIndex++} AND t.updated_at <= $${velParamIndex++}`;
      velocityParams.push(startDate, endDate);
      const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
      const velocityResult = await req.app.locals.pool.query(velocityQuery, velocityParams);
      const completed = parseInt(velocityResult.rows[0].completed_count || 0);
      const velocity = daysDiff > 0 ? (completed / daysDiff) : 0;
      
      res.json({
        ...stats,
        completed: parseInt(stats.completed || 0),
        inProgress: parseInt(stats.in_progress || 0),
        notStarted: parseInt(stats.not_started || 0),
        total: parseInt(stats.total || 0),
        velocity: Math.round(velocity * 10) / 10
      });
    } else {
      res.json({
        ...stats,
        completed: parseInt(stats.completed || 0),
        inProgress: parseInt(stats.in_progress || 0),
        notStarted: parseInt(stats.not_started || 0),
        total: parseInt(stats.total || 0),
        velocity: 0
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

