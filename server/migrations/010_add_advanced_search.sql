-- Migration: Add advanced search and saved searches
-- Date: 2025-12-04
-- Description: Creates saved_searches table for user saved filters/searches

BEGIN;

-- Saved searches/filters table
CREATE TABLE IF NOT EXISTS saved_searches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  query_text TEXT,
  filter_config JSONB DEFAULT '{}',
  scope VARCHAR(50) DEFAULT 'workspace', -- 'workspace', 'list', 'global'
  scope_id INTEGER, -- list_id or workspace_id depending on scope
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_workspace_id ON saved_searches(workspace_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_scope ON saved_searches(scope, scope_id);

COMMIT;

