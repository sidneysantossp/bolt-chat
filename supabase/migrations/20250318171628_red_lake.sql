/*
  # Fix subgroups relationships

  1. Changes
    - Add parent_id foreign key constraint if not exists
    - Add index for parent_id if not exists
    - Add index for group hierarchical queries
    - Add trigger to prevent circular references

  2. Security
    - Add RLS policies for subgroups
*/

-- Add parent_id foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'groups_parent_id_fkey'
  ) THEN
    ALTER TABLE groups 
    ADD CONSTRAINT groups_parent_id_fkey 
    FOREIGN KEY (parent_id) REFERENCES groups(id);
  END IF;
END $$;

-- Add index for parent_id if not exists
CREATE INDEX IF NOT EXISTS idx_groups_parent_id ON groups(parent_id);

-- Add index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_groups_hierarchy ON groups(id, parent_id);

-- Create function to check for circular references
CREATE OR REPLACE FUNCTION check_group_circular_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE group_chain AS (
      -- Base case: start with the new parent
      SELECT id, parent_id, 1 AS level
      FROM groups
      WHERE id = NEW.parent_id
      
      UNION ALL
      
      -- Recursive case: get all ancestors
      SELECT g.id, g.parent_id, gc.level + 1
      FROM groups g
      INNER JOIN group_chain gc ON g.id = gc.parent_id
      WHERE gc.level < 100  -- Prevent infinite recursion
    )
    SELECT 1 FROM group_chain WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Circular reference detected in group hierarchy';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent circular references
DROP TRIGGER IF EXISTS prevent_group_circular_ref ON groups;
CREATE TRIGGER prevent_group_circular_ref
  BEFORE INSERT OR UPDATE OF parent_id ON groups
  FOR EACH ROW
  WHEN (NEW.parent_id IS NOT NULL)
  EXECUTE FUNCTION check_group_circular_ref();

-- Add RLS policies for subgroups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Policy for reading groups
CREATE POLICY "Anyone can read active groups"
  ON groups
  FOR SELECT
  USING (status = 'active');

-- Policy for managing groups (admin only)
CREATE POLICY "Admins can manage groups"
  ON groups
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