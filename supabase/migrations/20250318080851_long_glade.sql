/*
  # Add OpenAI API Settings and Usage Tracking

  1. New Tables
    - `openai_usage` - Tracks API usage and costs
      - `id` (uuid, primary key)
      - `date` (date)
      - `tokens_used` (integer)
      - `cost_usd` (decimal)
      - `endpoint` (text)
      - `created_at` (timestamptz)

  2. New Settings
    - Add OpenAI configuration to platform settings
    - Add usage tracking settings

  3. Security
    - Enable RLS on new table
    - Add admin-only policies
*/

-- Create OpenAI usage tracking table
CREATE TABLE IF NOT EXISTS openai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  tokens_used integer NOT NULL DEFAULT 0,
  cost_usd decimal(10,4) NOT NULL DEFAULT 0,
  endpoint text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE openai_usage ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_openai_usage_date ON openai_usage(date);
CREATE INDEX IF NOT EXISTS idx_openai_usage_endpoint ON openai_usage(endpoint);

-- Create admin-only policies
CREATE POLICY "Admins can view OpenAI usage"
  ON openai_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can insert OpenAI usage"
  ON openai_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Add OpenAI settings to platform_settings
INSERT INTO platform_settings (key, value, description) VALUES
('moderation.openai', jsonb_build_object(
  'enabled', true,
  'max_daily_tokens', 100000,
  'max_monthly_cost_usd', 50.00,
  'alert_threshold_pct', 80,
  'endpoints', jsonb_build_object(
    'moderation', true,
    'completion', false,
    'embedding', false
  ),
  'rate_limits', jsonb_build_object(
    'requests_per_minute', 60,
    'tokens_per_request', 1000
  ),
  'notification_emails', ARRAY[]::text[]
), 'OpenAI API usage settings and limits')
ON CONFLICT (key) DO NOTHING;