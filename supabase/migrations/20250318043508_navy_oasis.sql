/*
  # Initial Schema Setup

  1. Tables
    - users: Core user data with authentication and profile information
    - messages: Chat messages with privacy and encryption support
    - reported_messages: Message reporting system for moderation
    - analytics_daily: Daily platform statistics
    - platform_settings: Global platform configuration
    - user_typing: Real-time typing status tracking
    - user_activity_logs: User activity monitoring

  2. Security
    - Row Level Security (RLS) enabled on all tables
    - Policies for public access, authenticated users, and admins
    - Secure data access patterns implemented

  3. Features
    - Analytics tracking via triggers
    - Message status tracking
    - User activity logging
*/

-- First, disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON users;', E'\n')
        FROM pg_policies 
        WHERE tablename = 'users'
    );
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  avatar_url text,
  is_admin boolean DEFAULT false,
  online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  birth_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES users(id) ON DELETE SET NULL,
  content text NOT NULL,
  is_private boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  read_at timestamptz,
  delivered_at timestamptz,
  media_url text,
  encrypted_content text,
  encryption_key text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Reported messages table
CREATE TABLE IF NOT EXISTS reported_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  UNIQUE(message_id, reported_by)
);

CREATE INDEX IF NOT EXISTS idx_reported_messages_status ON reported_messages(status);

-- Analytics daily table
CREATE TABLE IF NOT EXISTS analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  new_users integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  reported_messages integer DEFAULT 0,
  total_rooms integer DEFAULT 0,
  active_rooms integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_daily(date);

-- Platform settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);

-- User typing status table
CREATE TABLE IF NOT EXISTS user_typing (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- User activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON user_activity_logs(created_at);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_typing ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create analytics functions
CREATE OR REPLACE FUNCTION update_analytics_on_user_insert()
RETURNS trigger AS $$
BEGIN
  INSERT INTO analytics_daily (date, new_users, total_users)
  VALUES (CURRENT_DATE, 1, (SELECT COUNT(*) FROM users))
  ON CONFLICT (date) 
  DO UPDATE SET
    new_users = analytics_daily.new_users + 1,
    total_users = (SELECT COUNT(*) FROM users);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_analytics_on_message_insert()
RETURNS trigger AS $$
BEGIN
  INSERT INTO analytics_daily (date, total_messages)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date) 
  DO UPDATE SET
    total_messages = analytics_daily.total_messages + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for analytics
DROP TRIGGER IF EXISTS user_insert_analytics ON users;
CREATE TRIGGER user_insert_analytics
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_on_user_insert();

DROP TRIGGER IF EXISTS message_insert_analytics ON messages;
CREATE TRIGGER message_insert_analytics
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_on_message_insert();

-- Create new policies with unique names
CREATE POLICY "users_read_access_v1"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "users_manage_own_v1"
ON users
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_manage_all_v1"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND is_admin = true
  )
);