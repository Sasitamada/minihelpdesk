const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { checkWorkspacePermission, canEditTask } = require('../middleware/permissions');

// Configure multer for task attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/tasks');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'task-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to log task history
async function logTaskHistory(pool, taskId, userId, action, fieldName = null, oldValue = null, newValue = null) {
  try {
    await pool.query(
      `INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [taskId, userId, action, fieldName, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null]
    );
  } catch (error) {
    console.error('Error logging task history:', error);
  }
}

// Get all tasks with advanced filtering, pagination, and sorting
router.get('/', async (req, res) => {
  try {
    const {
      projectId,
      listId, // New: filter by list_id
      workspaceId,
      status, // Can be single or array: status[]=todo&status[]=inprogress
      priority,
      search,
      tag,
      assignedTo, // Can be single or array: assignedTo[]=1&assignedTo[]=2
      dueDateFrom,
      dueDateTo,
      orderBy = 'created_at',
      orderDirection = 'DESC',
      page = 1,
      perPage = 50,
      includeAssignees = 'false',
      includeHistory = 'false'
    } = req.query;

    // Build base query - simplified to avoid JSON equality operator issues.
    // Includes a computed blocked_count so the UI can quickly show which tasks are blocked.
    let query = `
      SELECT
        t.*,
        COALESCE((
          SELECT COUNT(*)
          FROM task_dependencies td
          JOIN tasks bt ON bt.id = td.dependency_task_id
          WHERE td.task_id = t.id
            AND bt.status <> 'done'
        ), 0) AS blocked_count
      FROM tasks t
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Workspace filter (required for security)
    if (workspaceId) {
      query += ` AND t.workspace_id = $${paramIndex}`;
      params.push(workspaceId);
      paramIndex++;
    }

    // Project filter (legacy support)
    if (projectId) {
      query += ` AND t.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    // List filter (ClickUp-style hierarchy)
    if (listId) {
      query += ` AND t.list_id = $${paramIndex}`;
      params.push(listId);
      paramIndex++;
    }

    // Status filter (supports array)
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      query += ` AND t.status = ANY($${paramIndex})`;
      params.push(statusArray);
      paramIndex++;
    }

    // Priority filter
    if (priority) {
      query += ` AND t.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    // Assignee filter (supports array for multi-assignee)
    if (assignedTo) {
      const assigneeArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
      query += ` AND EXISTS (
        SELECT 1 FROM task_assignees ta
        WHERE ta.task_id = t.id AND ta.user_id = ANY($${paramIndex})
      )`;
      params.push(assigneeArray);
      paramIndex++;
    }

    // Date range filters
    if (dueDateFrom) {
      query += ` AND t.due_date >= $${paramIndex}`;
      params.push(dueDateFrom);
      paramIndex++;
    }
    if (dueDateTo) {
      query += ` AND t.due_date <= $${paramIndex}`;
      params.push(dueDateTo);
      paramIndex++;
    }

    // Search filter (full-text search on title and description)
    if (search) {
      query += ` AND (
        t.title ILIKE $${paramIndex} OR
        t.description ILIKE $${paramIndex}
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm);
      paramIndex++;
      params.push(searchTerm);
      paramIndex++;
    }

    // Tag filter
    if (tag) {
      query += ` AND EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(t.tags) tag
        WHERE tag ILIKE $${paramIndex}
      )`;
      params.push(`%${tag}%`);
      paramIndex++;
    }

    // Validate orderBy to prevent SQL injection
    const allowedOrderBy = ['created_at', 'updated_at', 'due_date', 'title', 'priority', 'status', 'position'];
    const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'created_at';
    const safeOrderDirection = orderDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Ordering
    query += ` ORDER BY t.${safeOrderBy} ${safeOrderDirection}`;

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const perPageNum = Math.min(parseInt(perPage, 10) || 50, 100); // Max 100 per page
    const offset = (pageNum - 1) * perPageNum;
    
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(perPageNum, offset);

    // Execute query
    const { rows } = await req.app.locals.pool.query(query, params);
    
    // Load assignees separately if needed (to avoid JSON equality operator issues)
    if (includeAssignees === 'true' && rows.length > 0) {
      const taskIds = rows.map(t => t.id);
      const assigneesResult = await req.app.locals.pool.query(
        `SELECT ta.task_id, u.id, u.username, u.full_name, u.avatar
         FROM task_assignees ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.task_id = ANY($1)
         ORDER BY ta.task_id, ta.assigned_at`,
        [taskIds]
      );
      
      // Group assignees by task_id
      const assigneesByTask = {};
      assigneesResult.rows.forEach(a => {
        if (!assigneesByTask[a.task_id]) {
          assigneesByTask[a.task_id] = [];
        }
        assigneesByTask[a.task_id].push({
          id: a.id,
          username: a.username,
          full_name: a.full_name,
          avatar: a.avatar
        });
      });

      // Attach assignees to tasks
      rows.forEach(task => {
        task.assignees = assigneesByTask[task.id] || [];
      });
    } else {
      // Set empty array for assignees
      rows.forEach(task => {
        task.assignees = [];
      });
    }

    // Get total count for pagination metadata
    let countQuery = 'SELECT COUNT(DISTINCT t.id) as total FROM tasks t WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    // Apply same filters for count
    if (workspaceId) {
      countQuery += ` AND t.workspace_id = $${countParamIndex}`;
      countParams.push(workspaceId);
      countParamIndex++;
    }
    if (projectId) {
      countQuery += ` AND t.project_id = $${countParamIndex}`;
      countParams.push(projectId);
      countParamIndex++;
    }
    if (listId) {
      countQuery += ` AND t.list_id = $${countParamIndex}`;
      countParams.push(listId);
      countParamIndex++;
    }
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      countQuery += ` AND t.status = ANY($${countParamIndex})`;
      countParams.push(statusArray);
      countParamIndex++;
    }
    if (priority) {
      countQuery += ` AND t.priority = $${countParamIndex}`;
      countParams.push(priority);
      countParamIndex++;
    }
    if (assignedTo) {
      const assigneeArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
      countQuery += ` AND EXISTS (
        SELECT 1 FROM task_assignees ta
        WHERE ta.task_id = t.id AND ta.user_id = ANY($${countParamIndex})
      )`;
      countParams.push(assigneeArray);
      countParamIndex++;
    }
    if (dueDateFrom) {
      countQuery += ` AND t.due_date >= $${countParamIndex}`;
      countParams.push(dueDateFrom);
      countParamIndex++;
    }
    if (dueDateTo) {
      countQuery += ` AND t.due_date <= $${countParamIndex}`;
      countParams.push(dueDateTo);
      countParamIndex++;
    }
    if (search) {
      countQuery += ` AND (
        t.title ILIKE $${countParamIndex} OR
        t.description ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    if (tag) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(t.tags) tag
        WHERE tag ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${tag}%`);
      countParamIndex++;
    }

    const countResult = await req.app.locals.pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Load history if requested
    if (includeHistory === 'true' && rows.length > 0) {
      const taskIds = rows.map(t => t.id);
      const historyResult = await req.app.locals.pool.query(
        `SELECT th.*, u.username, u.full_name, u.avatar
         FROM task_history th
         LEFT JOIN users u ON th.user_id = u.id
         WHERE th.task_id = ANY($1)
         ORDER BY th.created_at DESC`,
        [taskIds]
      );
      
      // Group history by task_id
      const historyByTask = {};
      historyResult.rows.forEach(h => {
        if (!historyByTask[h.task_id]) {
          historyByTask[h.task_id] = [];
        }
        historyByTask[h.task_id].push(h);
      });

      // Attach history to tasks
      rows.forEach(task => {
        task.history = historyByTask[task.id] || [];
      });
    } else {
      // Set empty array for history
      rows.forEach(task => {
        task.history = [];
      });
    }

    // Response with pagination metadata
    res.json({
      data: rows,
      pagination: {
        page: pageNum,
        perPage: perPageNum,
        total,
        totalPages: Math.ceil(total / perPageNum)
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single task with history
router.get('/:id', async (req, res) => {
  try {
    const taskResult = await req.app.locals.pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (taskResult.rows.length === 0) return res.status(404).json({ message: 'Task not found' });
    
    const task = taskResult.rows[0];
    
    // Get task history
    const historyResult = await req.app.locals.pool.query(
      `SELECT th.*, u.username, u.full_name, u.avatar
       FROM task_history th
       LEFT JOIN users u ON th.user_id = u.id
       WHERE th.task_id = $1
       ORDER BY th.created_at DESC`,
      [req.params.id]
    );
    
    // Get reminders
    const remindersResult = await req.app.locals.pool.query(
      'SELECT * FROM task_reminders WHERE task_id = $1 ORDER BY reminder_date ASC',
      [req.params.id]
    );
    
    res.json({
      ...task,
      history: historyResult.rows,
      reminders: remindersResult.rows
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const { title, description, project, listId, workspace, assignedTo, status, priority, dueDate, createdBy, subtasks, tags, reminders, customFields, assignees } = req.body;
    
    // If listId is provided, use it; otherwise fall back to project (legacy support)
    const finalListId = listId || project;
    
    const { estimateMinutes } = req.body;
    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO tasks (title, description, project_id, list_id, workspace_id, assigned_to, status, priority, due_date, created_by, subtasks, tags, custom_fields, estimate_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        title, description, project || null, finalListId || null, workspace, assignedTo, 
        status || 'todo', priority || 'medium', dueDate, createdBy, 
        JSON.stringify(subtasks || []), 
        JSON.stringify(tags || []),
        JSON.stringify(customFields || []),
        estimateMinutes || null
      ]
    );
    
    const task = rows[0];
    
    // Log creation
    if (createdBy) {
      await logTaskHistory(req.app.locals.pool, task.id, createdBy, 'created', null, null, { title, status, priority });
    }
    
    // Add assignees if provided
    if (assignees && Array.isArray(assignees)) {
      for (const assigneeId of assignees) {
        await req.app.locals.pool.query(
          'INSERT INTO task_assignees (task_id, user_id, assigned_by) VALUES ($1, $2, $3)',
          [task.id, assigneeId, createdBy]
        );
      }
    }
    
    // Create reminders if provided
    if (reminders && Array.isArray(reminders)) {
      for (const reminderDate of reminders) {
        await req.app.locals.pool.query(
          'INSERT INTO task_reminders (task_id, user_id, reminder_date) VALUES ($1, $2, $3)',
          [task.id, assignedTo || createdBy, reminderDate]
        );
      }
    }
    
    // Trigger automation: task_created
    if (req.app.locals.automationEngine) {
      req.app.locals.automationEngine.executeAutomations('task_created', {
        taskId: task.id,
        workspaceId: workspace,
        listId: finalListId,
        projectId: project,
        status: task.status,
        priority: task.priority,
        createdBy
      });
    }
    
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH endpoint for partial updates with optimistic concurrency
router.patch('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { userId, version, updatedAt } = req.body;

    if (!userId) {
      return res.status(403).json({ message: 'Authentication required' });
    }

    // Get current task
    const currentTaskResult = await req.app.locals.pool.query(
      'SELECT *, version, updated_at FROM tasks WHERE id = $1',
      [taskId]
    );

    if (currentTaskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const currentTask = currentTaskResult.rows[0];

    // Optimistic concurrency check
    if (version !== undefined && currentTask.version !== version) {
      return res.status(409).json({
        message: 'Task was modified by another user. Please refresh and try again.',
        conflict: {
          currentVersion: currentTask.version,
          providedVersion: version,
          currentTask: currentTask
        }
      });
    }

    // Check updatedAt if version not provided
    if (updatedAt && new Date(currentTask.updated_at) > new Date(updatedAt)) {
      return res.status(409).json({
        message: 'Task was modified by another user. Please refresh and try again.',
        conflict: {
          currentUpdatedAt: currentTask.updated_at,
          providedUpdatedAt: updatedAt,
          currentTask: currentTask
        }
      });
    }

    // If status is being moved to "done", ensure there are no open blocking dependencies.
    // NOTE: This is a lightweight ClickUp-style check. In the future, this can be
    // extended to use workspace-specific "done" status types.
    if (req.body.status && req.body.status === 'done' && currentTask.status !== 'done') {
      const blockersResult = await req.app.locals.pool.query(
        `SELECT bt.id, bt.title, bt.status
         FROM task_dependencies td
         JOIN tasks bt ON bt.id = td.dependency_task_id
         WHERE td.task_id = $1 AND bt.status <> 'done'`,
        [taskId]
      );

      if (blockersResult.rows.length > 0) {
        return res.status(409).json({
          message: 'This task is blocked by other tasks. Complete them first or remove the dependency.',
          blockers: blockersResult.rows
        });
      }
    }

    // Build update query dynamically (only update provided fields)
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const fieldsToUpdate = ['title', 'description', 'status', 'priority', 'due_date', 'position', 'parent_task_id', 'subtask_level', 'estimate_minutes'];
    
    fieldsToUpdate.forEach(field => {
      const dbField = field === 'dueDate' ? 'due_date' : (field === 'estimateMinutes' ? 'estimate_minutes' : field);
      const bodyField = field === 'estimate_minutes' ? 'estimateMinutes' : field;
      if (req.body[bodyField] !== undefined && req.body[bodyField] !== currentTask[dbField]) {
        updates.push(`${dbField} = $${paramIndex}`);
        values.push(req.body[bodyField]);
        paramIndex++;
        
        // Log history
        if (userId && currentTask[dbField] !== req.body[bodyField]) {
          logTaskHistory(req.app.locals.pool, taskId, userId, 'updated', field, 
            currentTask[dbField]?.toString(), req.body[bodyField]?.toString());
        }
      }
    });

    // Handle JSONB fields
    if (req.body.subtasks !== undefined) {
      updates.push(`subtasks = $${paramIndex}`);
      values.push(JSON.stringify(req.body.subtasks));
      paramIndex++;
      if (userId) {
        logTaskHistory(req.app.locals.pool, taskId, userId, 'updated', 'subtasks', 
          currentTask.subtasks, req.body.subtasks);
      }
    }
    if (req.body.tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      values.push(JSON.stringify(req.body.tags));
      paramIndex++;
      if (userId) {
        logTaskHistory(req.app.locals.pool, taskId, userId, 'updated', 'tags', 
          currentTask.tags, req.body.tags);
      }
    }
    if (req.body.customFields !== undefined) {
      updates.push(`custom_fields = $${paramIndex}`);
      values.push(JSON.stringify(req.body.customFields));
      paramIndex++;
    }

    if (updates.length === 0) {
      const { rows } = await req.app.locals.pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
      return res.json(rows[0]);
    }

    // Increment version and update timestamp
    updates.push(`version = COALESCE(version, 1) + 1`);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(taskId);

    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const { rows } = await req.app.locals.pool.query(query, values);

    const updatedTask = rows[0];

    // Emit real-time update
    if (req.app.locals.io) {
      req.app.locals.io.to(`task-${taskId}`).emit('task-updated', {
        taskId,
        task: updatedTask,
        updatedBy: userId
      });
      if (updatedTask.workspace_id) {
        req.app.locals.io.to(`workspace-${updatedTask.workspace_id}`).emit('task-updated', {
          taskId,
          task: updatedTask,
          updatedBy: userId
        });
      }
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update task (requires edit permission) - Full update
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, assignedTo, subtasks, tags, userId } = req.body;
    const taskId = req.params.id;
    
    // Get task to check workspace
    const taskResult = await req.app.locals.pool.query('SELECT workspace_id FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Basic permission check - in production, use proper middleware
    // For now, allow if userId is provided (user is authenticated)
    if (!userId) {
      return res.status(403).json({ message: 'Authentication required to edit tasks' });
    }
    
    // Get current task to compare changes
    const currentTask = await req.app.locals.pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (currentTask.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const oldTask = currentTask.rows[0];
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (title !== undefined && title !== oldTask.title) {
      updates.push(`title = $${paramIndex}`);
      values.push(title);
      paramIndex++;
      if (userId) await logTaskHistory(req.app.locals.pool, taskId, userId, 'updated', 'title', oldTask.title, title);
    }
    if (description !== undefined && description !== oldTask.description) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
      if (userId) await logTaskHistory(req.app.locals.pool, taskId, userId, 'updated', 'description', oldTask.description, description);
    }
    if (status !== undefined && status !== oldTask.status) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
      if (userId) await logTaskHistory(req.app.locals.pool, taskId, userId, 'updated', 'status', oldTask.status, status);
    }
    if (priority !== undefined && priority !== oldTask.priority) {
      updates.push(`priority = $${paramIndex}`);
      values.push(priority);
      paramIndex++;
      if (userId) await logTaskHistory(req.app.locals.pool, taskId, userId, 'updated', 'priority', oldTask.priority, priority);
    }
    if (dueDate !== undefined && dueDate !== oldTask.due_date) {
      updates.push(`due_date = $${paramIndex}`);
      values.push(dueDate);
      paramIndex++;
      if (userId) await logTaskHistory(req.app.locals.pool, taskId, userId, 'updated', 'due_date', oldTask.due_date?.toString(), dueDate);
    }
    if (assignedTo !== undefined && assignedTo !== oldTask.assigned_to) {
      updates.push(`assigned_to = $${paramIndex}`);
      values.push(assignedTo);
      paramIndex++;
      if (userId) await logTaskHistory(req.app.locals.pool, taskId, userId, 'updated', 'assigned_to', oldTask.assigned_to?.toString(), assignedTo?.toString());
    }
    if (subtasks !== undefined) {
      updates.push(`subtasks = $${paramIndex}`);
      values.push(JSON.stringify(subtasks));
      paramIndex++;
      if (userId) await logTaskHistory(req.app.locals.pool, taskId, userId, 'updated', 'subtasks', oldTask.subtasks, subtasks);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      values.push(JSON.stringify(tags));
      paramIndex++;
      if (userId) await logTaskHistory(req.app.locals.pool, taskId, userId, 'updated', 'tags', oldTask.tags, tags);
    }
    if (req.body.customFields !== undefined) {
      updates.push(`custom_fields = $${paramIndex}`);
      values.push(JSON.stringify(req.body.customFields));
      paramIndex++;
      if (userId) await logTaskHistory(req.app.locals.pool, taskId, userId, 'updated', 'custom_fields', oldTask.custom_fields, req.body.customFields);
    }
    
    if (updates.length === 0) {
      const { rows } = await req.app.locals.pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
      return res.json(rows[0]);
    }
    
    updates.push(`version = COALESCE(version, 1) + 1`);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(taskId);
    
    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const { rows } = await req.app.locals.pool.query(query, values);
    
    // Emit real-time update via WebSocket
    if (req.app.locals.io) {
      const task = rows[0];
      req.app.locals.io.to(`task-${taskId}`).emit('task-updated', {
        taskId,
        task,
        updates,
        updatedBy: userId
      });
      if (task.workspace_id) {
        req.app.locals.io.to(`workspace-${task.workspace_id}`).emit('task-updated', {
          taskId,
          task,
          updates,
          updatedBy: userId
        });
      }
    }
    
    // Trigger automation: status_changed (if status was updated)
    if (status !== undefined && status !== oldTask.status && req.app.locals.automationEngine) {
      req.app.locals.automationEngine.executeAutomations('status_changed', {
        taskId,
        workspaceId: oldTask.workspace_id,
        listId: oldTask.list_id,
        projectId: oldTask.project_id,
        oldStatus: oldTask.status,
        newStatus: status,
        status: status, // For condition matching
        updatedBy: userId
      });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const taskId = req.params.id;
    
    // Log deletion
    if (userId) {
      await logTaskHistory(req.app.locals.pool, taskId, userId, 'deleted', null, null, null);
    }
    
    await req.app.locals.pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload attachment
router.post('/:id/attachments', upload.array('files', 10), async (req, res) => {
  try {
    const taskId = req.params.id;
    const { userId } = req.body;
    
    // Get current attachments
    const taskResult = await req.app.locals.pool.query('SELECT attachments FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const currentAttachments = taskResult.rows[0].attachments || [];
    const newAttachments = req.files.map(file => ({
      filename: file.originalname,
      path: `/uploads/tasks/${file.filename}`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId
    }));
    
    const allAttachments = [...(Array.isArray(currentAttachments) ? currentAttachments : JSON.parse(currentAttachments || '[]')), ...newAttachments];
    
    await req.app.locals.pool.query(
      'UPDATE tasks SET attachments = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(allAttachments), taskId]
    );
    
    if (userId) {
      await logTaskHistory(req.app.locals.pool, taskId, userId, 'added_attachment', 'attachments', null, newAttachments.map(a => a.filename).join(', '));
    }
    
    res.json({ message: 'Files uploaded', attachments: allAttachments });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete attachment
router.delete('/:id/attachments/:filename', async (req, res) => {
  try {
    const { id, filename } = req.params;
    const { userId } = req.body;
    
    const taskResult = await req.app.locals.pool.query('SELECT attachments FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const attachments = taskResult.rows[0].attachments || [];
    const filtered = attachments.filter(att => {
      const attObj = typeof att === 'string' ? JSON.parse(att) : att;
      return attObj.filename !== filename && attObj.path !== `/uploads/tasks/${filename}`;
    });
    
    // Delete file from filesystem
    const attachmentToDelete = attachments.find(att => {
      const attObj = typeof att === 'string' ? JSON.parse(att) : att;
      return attObj.filename === filename || attObj.path === `/uploads/tasks/${filename}`;
    });
    
    if (attachmentToDelete) {
      const filePath = path.join(__dirname, '../', attachmentToDelete.path || attachmentToDelete);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await req.app.locals.pool.query(
      'UPDATE tasks SET attachments = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(filtered), id]
    );
    
    if (userId) {
      await logTaskHistory(req.app.locals.pool, id, userId, 'removed_attachment', 'attachments', filename, null);
    }
    
    res.json({ message: 'Attachment deleted', attachments: filtered });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add reminder
router.post('/:id/reminders', async (req, res) => {
  try {
    const { reminderDate, userId } = req.body;
    const result = await req.app.locals.pool.query(
      'INSERT INTO task_reminders (task_id, user_id, reminder_date) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, userId, reminderDate]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get task history
router.get('/:id/history', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT th.*, u.username, u.full_name, u.avatar
       FROM task_history th
       LEFT JOIN users u ON th.user_id = u.id
       WHERE th.task_id = $1
       ORDER BY th.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---- Task Dependencies ----------------------------------------------------

// Get dependencies for a task (waiting-on and blocking)
router.get('/:id/dependencies', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);

    // Tasks this task is waiting on (blockers)
    const waitingOnResult = await req.app.locals.pool.query(
      `SELECT bt.*
       FROM task_dependencies td
       JOIN tasks bt ON bt.id = td.dependency_task_id
       WHERE td.task_id = $1
       ORDER BY bt.created_at DESC`,
      [taskId]
    );

    // Tasks this task is blocking
    const blockingResult = await req.app.locals.pool.query(
      `SELECT t.*
       FROM task_dependencies td
       JOIN tasks t ON t.id = td.task_id
       WHERE td.dependency_task_id = $1
       ORDER BY t.created_at DESC`,
      [taskId]
    );

    res.json({
      waitingOn: waitingOnResult.rows,
      blocking: blockingResult.rows
    });
  } catch (error) {
    console.error('Error fetching task dependencies:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add a dependency: current task (id) waits on dependencyTaskId
router.post('/:id/dependencies', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { dependencyTaskId, userId } = req.body;

    if (!dependencyTaskId) {
      return res.status(400).json({ message: 'dependencyTaskId is required' });
    }

    if (taskId === dependencyTaskId) {
      return res.status(400).json({ message: 'A task cannot depend on itself' });
    }

    // Prevent duplicate relationships
    const existing = await req.app.locals.pool.query(
      'SELECT id FROM task_dependencies WHERE task_id = $1 AND dependency_task_id = $2',
      [taskId, dependencyTaskId]
    );
    if (existing.rows.length > 0) {
      return res.status(200).json({ message: 'Dependency already exists' });
    }

    const result = await req.app.locals.pool.query(
      'INSERT INTO task_dependencies (task_id, dependency_task_id) VALUES ($1, $2) RETURNING *',
      [taskId, dependencyTaskId]
    );

    // Log in history that a dependency was added
    if (userId) {
      await logTaskHistory(
        req.app.locals.pool,
        taskId,
        userId,
        'added_dependency',
        'dependency',
        null,
        dependencyTaskId.toString()
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding dependency:', error);
    res.status(400).json({ message: error.message });
  }
});

// Remove a dependency (by dependencyTaskId)
router.delete('/:id/dependencies/:dependencyTaskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const dependencyTaskId = parseInt(req.params.dependencyTaskId, 10);
    const { userId } = req.body;

    await req.app.locals.pool.query(
      'DELETE FROM task_dependencies WHERE task_id = $1 AND dependency_task_id = $2',
      [taskId, dependencyTaskId]
    );

    if (userId) {
      await logTaskHistory(
        req.app.locals.pool,
        taskId,
        userId,
        'removed_dependency',
        'dependency',
        dependencyTaskId.toString(),
        null
      );
    }

    res.json({ message: 'Dependency removed' });
  } catch (error) {
    console.error('Error removing dependency:', error);
    res.status(400).json({ message: error.message });
  }
});

// Bulk update tasks with advanced operations
router.patch('/bulk', async (req, res) => {
  try {
    const { taskIds, updates, userId } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'taskIds array is required' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ message: 'updates object is required' });
    }

    if (!userId) {
      return res.status(403).json({ message: 'Authentication required' });
    }

    const client = await req.app.locals.pool.connect();
    try {
      await client.query('BEGIN');

      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      // Build update SET clause
      const allowedFields = ['status', 'priority', 'due_date', 'assigned_to'];
      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field)) {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(updates[field]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'No valid fields to update' });
      }

      // Always update timestamp and version
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateFields.push(`version = COALESCE(version, 1) + 1`);

      // Build WHERE clause for task IDs
      updateValues.push(taskIds);
      const whereClause = `id = ANY($${paramIndex})`;

      const updateQuery = `
        UPDATE tasks 
        SET ${updateFields.join(', ')} 
        WHERE ${whereClause}
        RETURNING id, title, status, priority, updated_at, version
      `;

      const result = await client.query(updateQuery, updateValues);
      const updatedTasks = result.rows;

      // Log history for each updated task
      for (const taskId of taskIds) {
        const task = updatedTasks.find(t => t.id === taskId);
        if (task) {
          Object.keys(updates).forEach(field => {
            if (allowedFields.includes(field)) {
              logTaskHistory(req.app.locals.pool, taskId, userId, 'bulk_updated', field, null, updates[field]?.toString());
            }
          });
        }
      }

      await client.query('COMMIT');

      // Emit real-time updates
      if (req.app.locals.io) {
        updatedTasks.forEach(task => {
          req.app.locals.io.to(`task-${task.id}`).emit('task-updated', {
            taskId: task.id,
            task,
            updatedBy: userId,
            bulkUpdate: true
          });
        });
      }

      res.json({
        message: `${updatedTasks.length} tasks updated`,
        updated: updatedTasks.length,
        tasks: updatedTasks
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ message: error.message });
  }
});

// Legacy bulk update endpoint (for backward compatibility)
router.put('/bulk/update', async (req, res) => {
  try {
    const { tasks, userId } = req.body;
    const client = await req.app.locals.pool.connect();
    try {
      await client.query('BEGIN');
      for (const task of tasks) {
        await client.query(
          'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP, version = COALESCE(version, 1) + 1 WHERE id = $2',
          [task.status, task.id]
        );
        if (userId && task.status) {
          logTaskHistory(req.app.locals.pool, task.id, userId, 'bulk_updated', 'status', null, task.status);
        }
      }
      await client.query('COMMIT');
      res.json({ message: 'Tasks updated' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get task assignees
router.get('/:id/assignees', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT ta.*, u.id as user_id, u.username, u.email, u.full_name, u.avatar
       FROM task_assignees ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = $1
       ORDER BY ta.assigned_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add assignee
router.post('/:id/assignees', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = JSON.parse(req.headers['user'] || '{}');
    const result = await req.app.locals.pool.query(
      'INSERT INTO task_assignees (task_id, user_id, assigned_by) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, userId, user.id || userId]
    );
    
    if (user.id) {
      await logTaskHistory(req.app.locals.pool, req.params.id, user.id, 'assigned', 'assignee', null, userId.toString());
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove assignee
router.delete('/:id/assignees/:userId', async (req, res) => {
  try {
    const user = JSON.parse(req.headers['user'] || '{}');
    await req.app.locals.pool.query(
      'DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    
    if (user.id) {
      await logTaskHistory(req.app.locals.pool, req.params.id, user.id, 'unassigned', 'assignee', req.params.userId, null);
    }
    
    res.json({ message: 'Assignee removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get task watchers
router.get('/:id/watchers', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT tw.*, u.id as user_id, u.username, u.email, u.full_name, u.avatar
       FROM task_watchers tw
       JOIN users u ON tw.user_id = u.id
       WHERE tw.task_id = $1
       ORDER BY tw.watched_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add watcher
router.post('/:id/watchers', async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await req.app.locals.pool.query(
      'INSERT INTO task_watchers (task_id, user_id) VALUES ($1, $2) RETURNING *',
      [req.params.id, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove watcher
router.delete('/:id/watchers/:userId', async (req, res) => {
  try {
    await req.app.locals.pool.query(
      'DELETE FROM task_watchers WHERE task_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Watcher removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get task checklists
router.get('/:id/checklists', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      'SELECT * FROM task_checklists WHERE task_id = $1 ORDER BY created_at',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create checklist
router.post('/:id/checklists', async (req, res) => {
  try {
    const { name, items } = req.body;
    const result = await req.app.locals.pool.query(
      'INSERT INTO task_checklists (task_id, name, items) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, name, JSON.stringify(items || [])]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update checklist
router.put('/:id/checklists/:checklistId', async (req, res) => {
  try {
    const { name, items } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (items !== undefined) {
      updates.push(`items = $${paramIndex}`);
      values.push(JSON.stringify(items));
      paramIndex++;
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.checklistId);
    paramIndex++;
    values.push(req.params.id);
    
    const query = `UPDATE task_checklists SET ${updates.join(', ')} WHERE id = $${paramIndex - 1} AND task_id = $${paramIndex} RETURNING *`;
    const result = await req.app.locals.pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete checklist
router.delete('/:id/checklists/:checklistId', async (req, res) => {
  try {
    await req.app.locals.pool.query(
      'DELETE FROM task_checklists WHERE id = $1 AND task_id = $2',
      [req.params.checklistId, req.params.id]
    );
    res.json({ message: 'Checklist deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== TIME TRACKING ROUTES ==========

// Get time logs for a task
router.get('/:id/time-logs', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT tl.*, u.username, u.full_name, u.avatar
       FROM time_logs tl
       LEFT JOIN users u ON tl.user_id = u.id
       WHERE tl.task_id = $1
       ORDER BY tl.start_time DESC`,
      [req.params.id]
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

// Add time log to a task
router.post('/:id/time-logs', async (req, res) => {
  try {
    const { userId, duration, startTime, endTime, description, billable } = req.body;
    const taskId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    if (!duration || duration <= 0) {
      return res.status(400).json({ message: 'Duration must be greater than 0' });
    }
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    // Verify task exists
    const taskCheck = await req.app.locals.pool.query(
      'SELECT id FROM tasks WHERE id = $1',
      [taskId]
    );
    
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO time_logs (task_id, user_id, duration, start_time, end_time, description, billable)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        taskId,
        parseInt(userId),
        parseInt(duration),
        startTime || null,
        endTime || null,
        description || null,
        billable || false
      ]
    );
    
    // Log activity
    await logTaskHistory(req.app.locals.pool, taskId, parseInt(userId), 'time_logged', 'time_log', null, {
      duration,
      startTime,
      endTime
    });
    
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error adding time log:', error);
    res.status(400).json({ message: error.message || 'Failed to add time log' });
  }
});

// Update time log
router.patch('/:id/time-logs/:logId', async (req, res) => {
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
    values.push(req.params.logId);
    values.push(req.params.id);
    
    const { rows } = await req.app.locals.pool.query(
      `UPDATE time_logs SET ${updates.join(', ')} WHERE id = $${paramIndex} AND task_id = $${paramIndex + 1} RETURNING *`,
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
router.delete('/:id/time-logs/:logId', async (req, res) => {
  try {
    const { rowCount } = await req.app.locals.pool.query(
      'DELETE FROM time_logs WHERE id = $1 AND task_id = $2',
      [req.params.logId, req.params.id]
    );
    
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Time log not found' });
    }
    
    res.json({ message: 'Time log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get timer status for a task (check if user has active timer)
router.get('/:id/timer/status', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Check for active timer (end_time is null and start_time exists)
    const { rows } = await req.app.locals.pool.query(
      `SELECT * FROM time_logs
       WHERE task_id = $1 AND user_id = $2 AND end_time IS NULL AND start_time IS NOT NULL
       ORDER BY start_time DESC
       LIMIT 1`,
      [req.params.id, userId]
    );
    
    if (rows.length === 0) {
      return res.json({ active: false });
    }
    
    const timer = rows[0];
    const elapsed = Math.floor((new Date() - new Date(timer.start_time)) / 1000);
    
    res.json({
      active: true,
      startTime: timer.start_time,
      elapsed,
      logId: timer.id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start timer for a task
router.post('/:id/timer/start', async (req, res) => {
  try {
    const { userId, description } = req.body;
    const taskId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    // Verify task exists
    const taskCheck = await req.app.locals.pool.query(
      'SELECT id FROM tasks WHERE id = $1',
      [taskId]
    );
    
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user already has an active timer on this task
    const existingTimer = await req.app.locals.pool.query(
      `SELECT id FROM time_logs
       WHERE task_id = $1 AND user_id = $2 AND end_time IS NULL AND start_time IS NOT NULL`,
      [taskId, parseInt(userId)]
    );
    
    if (existingTimer.rows.length > 0) {
      return res.status(400).json({ message: 'Timer already running for this task' });
    }
    
    // Create new time log entry with start_time but no end_time
    const { rows } = await req.app.locals.pool.query(
      `INSERT INTO time_logs (task_id, user_id, start_time, description, duration)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 0)
       RETURNING *`,
      [taskId, parseInt(userId), description || null]
    );
    
    // Log activity
    await logTaskHistory(req.app.locals.pool, taskId, parseInt(userId), 'timer_started', 'timer', null, {
      startTime: rows[0].start_time
    });
    
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(400).json({ message: error.message || 'Failed to start timer' });
  }
});

// Stop timer for a task
router.post('/:id/timer/stop', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Find active timer
    const { rows } = await req.app.locals.pool.query(
      `SELECT * FROM time_logs
       WHERE task_id = $1 AND user_id = $2 AND end_time IS NULL AND start_time IS NOT NULL
       ORDER BY start_time DESC
       LIMIT 1`,
      [req.params.id, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No active timer found' });
    }
    
    const timer = rows[0];
    const endTime = new Date();
    const startTime = new Date(timer.start_time);
    const duration = Math.floor((endTime - startTime) / 1000); // Duration in seconds
    
    // Update time log with end_time and duration
    const { rows: updatedRows } = await req.app.locals.pool.query(
      `UPDATE time_logs
       SET end_time = $1, duration = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [endTime, duration, timer.id]
    );
    
    // Log activity
    await logTaskHistory(req.app.locals.pool, req.params.id, userId, 'timer_stopped', 'timer', null, {
      duration,
      startTime: timer.start_time,
      endTime
    });
    
    res.json(updatedRows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;