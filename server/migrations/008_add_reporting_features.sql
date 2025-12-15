-- Migration: Add reporting and time tracking features
-- Date: 2025-12-04
-- Description: Adds time tracking, dashboard widget preferences, and sprint tracking

BEGIN;

-- Time tracking table
CREATE TABLE IF NOT EXISTS time_logs (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  duration INTEGER NOT NULL, -- Duration in seconds
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  description TEXT,
  billable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard widget preferences (per user/workspace)
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
);

-- Sprint tracking (optional - can use lists as sprints)
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
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_start_time ON time_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user_workspace ON dashboard_widgets(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_sprints_workspace_id ON sprints(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(start_date, end_date);

COMMIT;

