-- Migration: Add time estimates to tasks
-- Date: 2025-12-04
-- Description: Adds time estimate field to tasks table

BEGIN;

-- Add estimate_minutes to tasks table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='estimate_minutes') THEN
        ALTER TABLE tasks ADD COLUMN estimate_minutes INTEGER;
    END IF;
END $$;

-- Add index for filtering by estimates
CREATE INDEX IF NOT EXISTS idx_tasks_estimate_minutes ON tasks(estimate_minutes) WHERE estimate_minutes IS NOT NULL;

COMMIT;

