/*
  # Set up analytics_daily table

  1. Changes
    - Create analytics_daily table if it doesn't exist
    - Add initial data for today
    - Set up RLS policies
    
  2. Security
    - Enable RLS
    - Only admins can modify data
    - Public can read analytics
*/

-- Create analytics_daily table if it doesn't exist
CREATE TABLE IF NOT EXISTS analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  new_users integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  reported_messages integer DEFAULT 0,
  total_rooms integer DEFAULT 0,
  active_rooms integer DEFAULT 0,
  CONSTRAINT analytics_daily_date_key UNIQUE (date)
);

-- Enable RLS
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage analytics"
ON analytics_daily
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Public can read analytics"
ON analytics_daily
FOR SELECT
TO public
USING (true);

-- Insert initial data for today if it doesn't exist
INSERT INTO analytics_daily (
  date,
  total_users,
  active_users,
  new_users,
  total_messages,
  reported_messages,
  total_rooms,
  active_rooms
)
SELECT
  CURRENT_DATE,
  (SELECT COUNT(*) FROM users),
  (SELECT COUNT(*) FROM users WHERE last_seen > CURRENT_TIMESTAMP - INTERVAL '24 hours'),
  (SELECT COUNT(*) FROM users WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'),
  (SELECT COUNT(*) FROM messages),
  (SELECT COUNT(*) FROM reported_messages WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'),
  5, -- Default number of rooms
  3  -- Default number of active rooms
ON CONFLICT (date) DO NOTHING;