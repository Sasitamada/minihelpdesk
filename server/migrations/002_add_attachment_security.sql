-- Migration: Add secure attachment URLs
-- Date: 2025-11-30
-- Description: Adds signed URL support for attachments

BEGIN;

-- Add signed URL fields to attachments metadata
-- Note: Actual signed URLs will be generated on-the-fly, but we store metadata
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_metadata JSONB DEFAULT '{}';

-- Add attachment access log for security auditing
CREATE TABLE IF NOT EXISTS attachment_access_log (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  attachment_path VARCHAR(500) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_attachment_access_task_id ON attachment_access_log(task_id);
CREATE INDEX IF NOT EXISTS idx_attachment_access_user_id ON attachment_access_log(user_id);

COMMIT;

