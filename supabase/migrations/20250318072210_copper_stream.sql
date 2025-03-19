/*
  # Add moderation fields to messages table

  1. Changes
    - Add moderation-related columns to messages table:
      - moderated: boolean to track if message was checked
      - moderation_flagged: boolean for flagged content
      - moderation_categories: jsonb for detailed flags
      - moderation_scores: jsonb for confidence scores
      
  2. Security
    - Keep existing RLS policies
*/

-- Add moderation fields to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS moderated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS moderation_flagged boolean,
ADD COLUMN IF NOT EXISTS moderation_categories jsonb,
ADD COLUMN IF NOT EXISTS moderation_scores jsonb;

-- Create index for moderation status
CREATE INDEX IF NOT EXISTS idx_messages_moderated ON messages(moderated);
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON messages(moderation_flagged);