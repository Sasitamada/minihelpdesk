-- Migration: Task dependencies support
-- Date: 2025-12-03
-- Adds a table to track blocking / waiting-on relationships between tasks.
-- A row means: task_id "is waiting on" dependency_task_id.
-- From this we can derive:
--   - Waiting on:  SELECT * FROM task_dependencies WHERE task_id = $TASK_ID
--   - Blocking:    SELECT * FROM task_dependencies WHERE dependency_task_id = $TASK_ID

BEGIN;

CREATE TABLE IF NOT EXISTS task_dependencies (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, dependency_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id
  ON task_dependencies(task_id);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_dependency_task_id
  ON task_dependencies(dependency_task_id);

COMMIT;


