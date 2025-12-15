-- Migration: Add ClickUp-style improvements to tasks
-- Date: 2025-11-30
-- Description: Adds version field for optimistic concurrency, indexes for performance,
--              custom statuses support, and improves task structure

BEGIN;

-- Add version field for optimistic concurrency control
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add position/order field for custom sorting
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Add parent_task_id for nested subtasks (up to 2 levels)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE;

-- Add subtask_level to track nesting depth (0 = main task, 1-2 = subtask levels)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtask_level INTEGER DEFAULT 0;

-- Add custom statuses table (workspace-specific statuses)
CREATE TABLE IF NOT EXISTS custom_statuses (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) DEFAULT '#6c757d',
  position INTEGER DEFAULT 0,
  type VARCHAR(50) DEFAULT 'custom', -- 'todo', 'inprogress', 'done', 'custom'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, name)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history(created_at);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);

-- Enable pg_trgm extension if not exists (for fuzzy search)
-- Note: This may require superuser privileges. If it fails, the indexes below will be skipped.
DO $$ 
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm extension not available or already exists. Full-text search indexes will be skipped.';
END $$;

-- Add full-text search indexes (only if pg_trgm is available)
-- These are optional and will be skipped if pg_trgm is not available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm ON tasks USING gin(title gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_tasks_description_trgm ON tasks USING gin(description gin_trgm_ops);
  ELSE
    -- Fallback: Use standard GIN indexes without trigram
    CREATE INDEX IF NOT EXISTS idx_tasks_title_search ON tasks USING gin(to_tsvector('english', title));
    CREATE INDEX IF NOT EXISTS idx_tasks_description_search ON tasks USING gin(to_tsvector('english', description));
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Full-text search indexes could not be created. Standard search will still work.';
END $$;

-- Add activity log improvements
ALTER TABLE task_history ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add task position tracking for drag-and-drop
CREATE TABLE IF NOT EXISTS task_positions (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  list_id INTEGER, -- Can be status, project, or custom list
  position INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, list_id)
);

-- Add indexes for task positions
CREATE INDEX IF NOT EXISTS idx_task_positions_list_id ON task_positions(list_id);
CREATE INDEX IF NOT EXISTS idx_task_positions_position ON task_positions(position);

COMMIT;

