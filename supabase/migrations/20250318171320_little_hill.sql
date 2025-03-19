/*
  # Add group_id to rooms table

  1. Changes
    - Add group_id column to rooms table to establish relationship with groups
    - Add index for better query performance
    - Add foreign key constraint to ensure data integrity

  2. Security
    - No changes to RLS policies needed
*/

-- Add group_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE rooms 
    ADD COLUMN group_id uuid REFERENCES groups(id);

    -- Add index for group_id
    CREATE INDEX IF NOT EXISTS idx_rooms_group_id ON rooms(group_id);
  END IF;
END $$;