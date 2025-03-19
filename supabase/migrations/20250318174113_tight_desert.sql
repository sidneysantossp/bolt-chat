/*
  # Fix Group and Room Relationships

  1. Changes
    - Add missing indexes for group relationships
    - Add trigger to automatically update room counts
    - Fix room-group relationships

  2. Security
    - Update RLS policies for rooms
*/

-- Create function to update room counts
CREATE OR REPLACE FUNCTION update_room_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update room count for the group
  IF TG_OP = 'INSERT' THEN
    UPDATE groups 
    SET room_count = COALESCE(room_count, 0) + 1
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups
    SET room_count = GREATEST(0, COALESCE(room_count, 0) - 1)
    WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for room count updates
DROP TRIGGER IF EXISTS update_room_counts_trigger ON rooms;
CREATE TRIGGER update_room_counts_trigger
  AFTER INSERT OR DELETE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_room_counts();

-- Add room_count column to groups if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'groups' AND column_name = 'room_count'
  ) THEN
    ALTER TABLE groups ADD COLUMN room_count int DEFAULT 0;
  END IF;
END $$;

-- Update initial room counts
UPDATE groups g
SET room_count = (
  SELECT COUNT(*)
  FROM rooms r
  WHERE r.group_id = g.id
);

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can read active rooms" ON rooms;
  DROP POLICY IF EXISTS "Admins can manage rooms" ON rooms;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create new policies
CREATE POLICY "Anyone can read active rooms"
  ON rooms
  FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage rooms"
  ON rooms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_group_status ON rooms(group_id, status);
CREATE INDEX IF NOT EXISTS idx_groups_parent_status ON groups(parent_id, status);

-- Fix any orphaned rooms
UPDATE rooms r
SET group_id = g.id
FROM groups g
WHERE r.name LIKE g.name || ' - Sala%'
AND r.group_id IS NULL;