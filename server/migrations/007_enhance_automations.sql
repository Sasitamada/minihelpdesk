-- Migration: Enhance automations with recurring support and list/space scoping
-- Date: 2025-12-04
-- Description: Adds recurring schedule support, list/space scoping, and better trigger/action support

BEGIN;

-- Add recurring schedule fields
ALTER TABLE automations ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(50); -- 'none', 'daily', 'weekly', 'monthly', 'cron'
ALTER TABLE automations ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{}'; -- { time: '09:00', dayOfWeek: 1, etc. }
ALTER TABLE automations ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMP;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP;

-- Add list/space scoping (optional - automations can be workspace-wide or list-specific)
ALTER TABLE automations ADD COLUMN IF NOT EXISTS list_id INTEGER REFERENCES lists(id) ON DELETE CASCADE;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE;

-- Add index for recurring automations
CREATE INDEX IF NOT EXISTS idx_automations_next_run_at ON automations(next_run_at) WHERE schedule_type IS NOT NULL AND enabled = TRUE;

-- Add index for list/space scoping
CREATE INDEX IF NOT EXISTS idx_automations_list_id ON automations(list_id);
CREATE INDEX IF NOT EXISTS idx_automations_space_id ON automations(space_id);

COMMIT;

