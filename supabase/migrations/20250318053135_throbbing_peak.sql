/*
  # Create Rooms Table and Policies

  1. New Tables
    - `rooms` table for managing chat rooms
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text)
      - `max_users` (integer)
      - `current_users` (integer)
      - `status` (text: active/archived)
      - `created_at` (timestamp)
      - `created_by` (uuid, references users)
      - `last_message` (text)
      - `last_message_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for public read access
    - Add policies for admin management
    - Add policies for user participation

  3. Indexes
    - Index on status for filtering
    - Index on created_at for sorting
    - Index on last_message_at for sorting
*/

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  max_users integer NOT NULL DEFAULT 25,
  current_users integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  last_message text,
  last_message_at timestamptz,
  
  -- Add constraint for status values
  CONSTRAINT rooms_status_check CHECK (status IN ('active', 'archived')),
  
  -- Add constraint for user counts
  CONSTRAINT rooms_users_check CHECK (current_users >= 0 AND current_users <= max_users)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at);
CREATE INDEX IF NOT EXISTS idx_rooms_last_message ON rooms(last_message_at);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Create policies

-- Public can view active rooms
CREATE POLICY "allow_public_view_active_rooms"
ON rooms
FOR SELECT
TO public
USING (status = 'active');

-- Admins can do everything
CREATE POLICY "allow_admin_manage_rooms"
ON rooms
FOR ALL
TO authenticated
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

-- Function to update room user count
CREATE OR REPLACE FUNCTION update_room_user_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE rooms 
    SET current_users = current_users + 1
    WHERE id = NEW.room_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE rooms 
    SET current_users = current_users - 1
    WHERE id = OLD.room_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some initial rooms for testing
INSERT INTO rooms (name, description, max_users, status)
VALUES 
  ('General Chat', 'General discussion room', 50, 'active'),
  ('Support', 'Get help and support', 25, 'active'),
  ('Newcomers', 'Welcome room for new users', 100, 'active')
ON CONFLICT DO NOTHING;