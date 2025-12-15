-- Migration: Fix lists sequence after migrating from projects
-- Date: 2025-12-04
-- Description: Ensures lists.id sequence is correctly aligned with existing data

BEGIN;

-- Ensure the sequence exists and is owned by lists.id
DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('lists', 'id') INTO seq_name;

  IF seq_name IS NOT NULL THEN
    -- Align the sequence with the current max(id) in lists
    EXECUTE format(
      'SELECT setval(%L, COALESCE((SELECT MAX(id) FROM lists), 0) + 1, false)',
      seq_name
    );
  END IF;
END $$;

COMMIT;


