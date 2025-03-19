/*
  # Add group_id to rooms table

  1. Changes
    - Add group_id column to rooms table
    - Add foreign key constraint to groups table
    - Add index for better query performance

  2. Security
    - No changes to RLS policies
*/

-- Add group_id column to rooms table
ALTER TABLE rooms 
ADD COLUMN group_id uuid REFERENCES groups(id);

-- Add index for group_id
CREATE INDEX idx_rooms_group_id ON rooms(group_id);