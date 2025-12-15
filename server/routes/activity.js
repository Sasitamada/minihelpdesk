const express = require('express');
const router = express.Router();

// Search/filter activity history
router.get('/', async (req, res) => {
  try {
    const {
      workspaceId,
      listId,
      taskId,
      userId,
      eventType,
      dateFrom,
      dateTo,
      search,
      page = 1,
      perPage = 50
    } = req.query;

    let query = `
      SELECT 
        th.*,
        u.username,
        u.full_name,
        u.avatar,
        t.title as task_title,
        t.id as task_id,
        t.workspace_id
      FROM task_history th
      LEFT JOIN users u ON th.user_id = u.id
      LEFT JOIN tasks t ON th.task_id = t.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Workspace filter
    if (workspaceId) {
      query += ` AND t.workspace_id = $${paramIndex++}`;
      params.push(workspaceId);
    }

    // List filter
    if (listId) {
      query += ` AND EXISTS (
        SELECT 1 FROM tasks WHERE id = th.task_id AND list_id = $${paramIndex}
      )`;
      params.push(listId);
      paramIndex++;
    }

    // Task filter
    if (taskId) {
      query += ` AND th.task_id = $${paramIndex++}`;
      params.push(taskId);
    }

    // User filter
    if (userId) {
      query += ` AND th.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    // Event type filter
    if (eventType) {
      const eventTypes = Array.isArray(eventType) ? eventType : [eventType];
      query += ` AND th.action = ANY($${paramIndex++})`;
      params.push(eventTypes);
    }

    // Date range filters
    if (dateFrom) {
      query += ` AND th.created_at >= $${paramIndex++}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND th.created_at <= $${paramIndex++}`;
      params.push(dateTo);
    }

    // Text search in field_name, old_value, new_value
    if (search) {
      const searchTerm = `%${search}%`;
      query += ` AND (
        th.action ILIKE $${paramIndex} OR
        th.field_name ILIKE $${paramIndex + 1} OR
        th.old_value::text ILIKE $${paramIndex + 2} OR
        th.new_value::text ILIKE $${paramIndex + 3} OR
        t.title ILIKE $${paramIndex + 4}
      )`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      paramIndex += 5;
    }

    const offset = (parseInt(page) - 1) * parseInt(perPage);
    query += ` ORDER BY th.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(perPage), offset);

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
      createdAt: row.created_at,
      workspaceId: row.workspace_id
    }));

    res.json(activities);
  } catch (error) {
    console.error('Activity search error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

