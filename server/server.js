const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to PostgreSQL (Render.com)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? {
    rejectUnauthorized: false
  } : undefined
});

pool.connect()
  .then(() => {
    console.log('PostgreSQL/Neon connected successfully');
    // Create tables if they don't exist
    createTables();
  })
  .catch(err => console.error('Database connection error:', err));

// Create tables function
async function createTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner INTEGER,
        color VARCHAR(50) DEFAULT '#7b68ee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        owner INTEGER,
        color VARCHAR(50) DEFAULT '#4a9eff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Spaces (between workspace and folders/lists)
    await client.query(`
      CREATE TABLE IF NOT EXISTS spaces (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(50) DEFAULT '#ff6b6b',
        icon VARCHAR(50),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Folders (grouping lists inside a space)
    await client.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(50) DEFAULT '#6b5ce6',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS space_id INTEGER REFERENCES spaces(id) ON DELETE SET NULL
    `);

    await client.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL
    `);

    // Lists table (ClickUp-style hierarchy: Workspace → Space → Folder → List → Tasks)
    await client.query(`
      CREATE TABLE IF NOT EXISTS lists (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        space_id INTEGER REFERENCES spaces(id) ON DELETE SET NULL,
        folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
        color VARCHAR(50) DEFAULT '#4a9eff',
        owner INTEGER REFERENCES users(id),
        position INTEGER DEFAULT 0,
        task_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add list_id to tasks if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='list_id') THEN
          ALTER TABLE tasks ADD COLUMN list_id INTEGER REFERENCES lists(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'disconnected',
        settings JSONB DEFAULT '{}'::jsonb,
        auth_data JSONB DEFAULT '{}'::jsonb,
        created_by INTEGER REFERENCES users(id),
        last_synced_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(workspace_id, type)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_logs (
        id SERIAL PRIMARY KEY,
        integration_id INTEGER REFERENCES integrations(id) ON DELETE CASCADE,
        level VARCHAR(20) DEFAULT 'info',
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        assigned_to INTEGER,
        status VARCHAR(50) DEFAULT 'todo',
        priority VARCHAR(50) DEFAULT 'medium',
        due_date TIMESTAMP,
        created_by INTEGER,
        subtasks JSONB DEFAULT '[]',
        attachments JSONB DEFAULT '[]',
        tags JSONB DEFAULT '[]',
        custom_fields JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add tags column to tasks if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='tags') THEN
          ALTER TABLE tasks ADD COLUMN tags JSONB DEFAULT '[]';
        END IF;
      END $$;
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        author INTEGER,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        avatar VARCHAR(500),
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add new columns to users table if they don't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio') THEN
          ALTER TABLE users ADD COLUMN bio TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN
          ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(workspace_id, user_id)
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_invitations (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        invited_by INTEGER REFERENCES users(id),
        role VARCHAR(50) DEFAULT 'member',
        token VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_tags (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        tag VARCHAR(100) NOT NULL,
        color VARCHAR(50) DEFAULT '#4a9eff',
        UNIQUE(task_id, tag)
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_history (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        field_name VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_reminders (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        reminder_date TIMESTAMP NOT NULL,
        notified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Task assignees (multiple assignees support)
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_assignees (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by INTEGER REFERENCES users(id),
        UNIQUE(task_id, user_id)
      )
    `);

    // Task watchers/followers
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_watchers (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, user_id)
      )
    `);

    // Task checklists (separate from subtasks)
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_checklists (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        items JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        related_id INTEGER,
        related_type VARCHAR(50),
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add from_user_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='from_user_id') THEN
          ALTER TABLE notifications ADD COLUMN from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Docs/Pages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS docs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Shareable links table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shareable_links (
        id SERIAL PRIMARY KEY,
        token VARCHAR(255) UNIQUE NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id INTEGER NOT NULL,
        created_by INTEGER REFERENCES users(id),
        expires_at TIMESTAMP,
        access_level VARCHAR(50) DEFAULT 'view',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Automations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS automations (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        trigger_type VARCHAR(50) NOT NULL,
        trigger_conditions JSONB DEFAULT '{}',
        action_type VARCHAR(50) NOT NULL,
        action_data JSONB DEFAULT '{}',
        enabled BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_chat_messages (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        author VARCHAR(255),
        message TEXT,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Time tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_logs (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        duration INTEGER NOT NULL,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        description TEXT,
        billable BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dashboard widget preferences
    await client.query(`
      CREATE TABLE IF NOT EXISTS dashboard_widgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        widget_type VARCHAR(50) NOT NULL,
        widget_config JSONB DEFAULT '{}',
        position INTEGER DEFAULT 0,
        visible BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, workspace_id, widget_type)
      )
    `);

    // Sprint tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS sprints (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        list_id INTEGER REFERENCES lists(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        goal TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for reporting
    await client.query(`CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON time_logs(task_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON time_logs(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_time_logs_start_time ON time_logs(start_time)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user_workspace ON dashboard_widgets(user_id, workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sprints_workspace_id ON sprints(workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(start_date, end_date)`);

    // Add estimate_minutes to tasks if not exists
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='estimate_minutes') THEN
              ALTER TABLE tasks ADD COLUMN estimate_minutes INTEGER;
          END IF;
      END $$;
    `);

    // Saved searches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        query_text TEXT,
        filter_config JSONB DEFAULT '{}',
        scope VARCHAR(50) DEFAULT 'workspace',
        scope_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_saved_searches_workspace_id ON saved_searches(workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_saved_searches_scope ON saved_searches(scope, scope_id)`);
    
    console.log('Database tables created or already exist');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    client.release();
  }
}

// Export pool
app.locals.pool = pool;

// Routes
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/workspace-invitations', require('./routes/workspaceInvitations'));
app.use('/api/workspace-chat', require('./routes/workspaceChat'));
app.use('/api/sharing', require('./routes/sharing'));
app.use('/api/spaces', require('./routes/spaces'));
app.use('/api/folders', require('./routes/folders'));
app.use('/api/lists', require('./routes/lists'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/automations', require('./routes/automations'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/docs', require('./routes/docs'));
app.use('/api/time-logs', require('./routes/timeLogs'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/dashboard-widgets', require('./routes/dashboardWidgets'));
app.use('/api/search', require('./routes/search'));
app.use('/api/saved-searches', require('./routes/savedSearches'));
app.use('/api/activity', require('./routes/activity'));

// Initialize Automation Engine
const AutomationEngine = require('./services/automationEngine');
let automationEngine;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join task room for real-time updates
  socket.on('join-task', (taskId) => {
    socket.join(`task-${taskId}`);
  });

  // Leave task room
  socket.on('leave-task', (taskId) => {
    socket.leave(`task-${taskId}`);
  });

  // Join workspace room
  socket.on('join-workspace', (workspaceId) => {
    socket.join(`workspace-${workspaceId}`);
  });

  // Join user room for notifications
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
  });

  // Real-time task updates
  socket.on('task-update', (data) => {
    const { taskId, workspaceId } = data;
    if (workspaceId) {
      io.to(`workspace-${workspaceId}`).emit('task-updated', data);
    }
    if (taskId) {
      io.to(`task-${taskId}`).emit('task-updated', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.locals.io = io;

// Initialize Automation Engine after pool is ready
automationEngine = new AutomationEngine(pool, io);
app.locals.automationEngine = automationEngine;

// Due date checker (runs every hour)
setInterval(async () => {
  try {
    const client = await pool.connect();
    try {
      // Get all tasks with due dates in the next 24 hours (for due_date_close)
      const { rows: tasksClose } = await client.query(
        `SELECT t.*, ta.user_id as assignee_id, t.list_id
         FROM tasks t
         LEFT JOIN task_assignees ta ON t.id = ta.task_id
         WHERE t.due_date IS NOT NULL
         AND t.due_date > NOW()
         AND t.due_date <= NOW() + INTERVAL '24 hours'
         AND t.status != 'done'`
      );

      // Get all overdue tasks (for due_date_passed)
      const { rows: tasksOverdue } = await client.query(
        `SELECT t.*, ta.user_id as assignee_id, t.list_id,
                l.space_id
         FROM tasks t
         LEFT JOIN task_assignees ta ON t.id = ta.task_id
         LEFT JOIN lists l ON t.list_id = l.id
         WHERE t.due_date IS NOT NULL
         AND t.due_date < NOW()
         AND t.status != 'done'`
      );

      // Execute due_date_close automations
      for (const task of tasksClose) {
        if (automationEngine) {
          await automationEngine.executeAutomations('due_date_close', {
            taskId: task.id,
            workspaceId: task.workspace_id,
            listId: task.list_id,
            projectId: task.project_id,
            dueDate: task.due_date,
            assigneeId: task.assignee_id
          });
        }
      }

      // Execute due_date_passed automations
      for (const task of tasksOverdue) {
        if (automationEngine) {
          await automationEngine.executeAutomations('due_date_passed', {
            taskId: task.id,
            workspaceId: task.workspace_id,
            listId: task.list_id,
            spaceId: task.space_id,
            projectId: task.project_id,
            dueDate: task.due_date,
            assigneeId: task.assignee_id,
            status: task.status
          });
        }
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error checking due dates:', error);
  }
}, 60 * 60 * 1000); // Run every hour

// Recurring automations checker (runs every 5 minutes)
setInterval(async () => {
  try {
    if (automationEngine) {
      await automationEngine.checkRecurringAutomations();
    }
  } catch (error) {
    console.error('Error checking recurring automations:', error);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Automation engine initialized');
  console.log('Due date reminder checker running (every hour)');
});
