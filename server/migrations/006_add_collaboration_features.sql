-- Migration: Add collaboration features (threaded comments, assigned comments, mentions)
-- Date: 2025-12-04
-- Description: Adds threading support to comments, assigned comments, and mentions tracking

BEGIN;

-- Add threading support to comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]';

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_assigned_to ON comments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_comments_task_id_created_at ON comments(task_id, created_at);

-- Add mentions tracking to task_history for comment mentions
-- (task_history already exists, just ensuring it can handle comment-related events)

COMMIT;

