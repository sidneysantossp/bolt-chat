/*
  # Add API Keys Management

  1. New Tables
    - `api_keys` - Stores API keys and their configurations
      - `id` (uuid, primary key)
      - `name` (text)
      - `key_type` (text) - Type of API key (openai, etc)
      - `key_value` (text) - Encrypted API key
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid)
      - `last_used` (timestamptz)
      - `expires_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add admin-only policies
*/

-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_type text NOT NULL,
  key_value text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  last_used timestamptz,
  expires_at timestamptz,
  
  CONSTRAINT valid_key_type CHECK (key_type IN ('openai', 'other'))
);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_type ON api_keys(key_type);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- Create admin-only policies
CREATE POLICY "Admins can manage API keys"
  ON api_keys
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

-- Function to update last_used timestamp
CREATE OR REPLACE FUNCTION update_api_key_last_used()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_used = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking last used
CREATE TRIGGER api_key_last_used_trigger
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  WHEN (OLD.key_value IS DISTINCT FROM NEW.key_value)
  EXECUTE FUNCTION update_api_key_last_used();