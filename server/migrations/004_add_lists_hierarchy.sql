-- Migration: Add ClickUp-style Lists hierarchy
-- Date: 2025-12-03
-- Description: Creates lists table, migrates projects to lists, adds list_id to tasks

BEGIN;

-- Create lists table (replaces projects as the container for tasks)
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
);

-- Migrate existing projects to lists
INSERT INTO lists (id, name, description, workspace_id, space_id, folder_id, color, owner, created_at, updated_at)
SELECT id, name, description, workspace_id, space_id, folder_id, color, owner, created_at, updated_at
FROM projects
ON CONFLICT DO NOTHING;

-- Add list_id to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS list_id INTEGER REFERENCES lists(id) ON DELETE SET NULL;

-- Migrate existing project_id references to list_id
UPDATE tasks SET list_id = project_id WHERE project_id IS NOT NULL AND list_id IS NULL;

-- Add indexes for lists
CREATE INDEX IF NOT EXISTS idx_lists_workspace_id ON lists(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lists_space_id ON lists(space_id);
CREATE INDEX IF NOT EXISTS idx_lists_folder_id ON lists(folder_id);
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);

-- Update task_count for each list
UPDATE lists l
SET task_count = (
  SELECT COUNT(*) 
  FROM tasks t 
  WHERE t.list_id = l.id
);

COMMIT;

