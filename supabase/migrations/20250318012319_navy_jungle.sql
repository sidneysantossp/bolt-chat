/*
  # Add profile fields to users table
  
  1. Changes
    - Add birth_date column for user's date of birth
    - Add password_hash column for storing hashed passwords
    
  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;