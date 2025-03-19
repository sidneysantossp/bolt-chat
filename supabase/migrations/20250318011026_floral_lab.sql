/*
  # Add username field to users table

  1. Changes
    - Add `username` column to `users` table
    - Make it nullable initially to not break existing records
    - Add unique constraint to ensure usernames are unique

  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Add unique constraint
ALTER TABLE users
ADD CONSTRAINT users_username_unique UNIQUE (username);