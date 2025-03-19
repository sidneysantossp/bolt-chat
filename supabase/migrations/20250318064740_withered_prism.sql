/*
  # Add Sample Messages and Reports

  1. Changes
    - Insert sample messages with offensive content for testing moderation
    - Add corresponding reports with various statuses and reasons
    - Create test users with proper auth setup

  2. Sample Data
    - 5 test users with different roles
    - 5 reported messages with different types of violations
    - Reports in different states (pending, resolved, dismissed)
*/

-- Create test users in auth.users first
DO $$
DECLARE
  john_id uuid := gen_random_uuid();
  jane_id uuid := gen_random_uuid();
  mike_id uuid := gen_random_uuid();
  sarah_id uuid := gen_random_uuid();
  alex_id uuid := gen_random_uuid();
BEGIN
  -- Insert into auth.users first
  INSERT INTO auth.users (id, email, email_confirmed_at)
  VALUES 
    (john_id, 'john_doe@example.com', NOW()),
    (jane_id, 'jane_smith@example.com', NOW()),
    (mike_id, 'mike_wilson@example.com', NOW()),
    (sarah_id, 'sarah_jones@example.com', NOW()),
    (alex_id, 'alex_brown@example.com', NOW());

  -- Then insert into public.users
  INSERT INTO public.users (id, username, status, created_at)
  VALUES 
    (john_id, 'john_doe', 'active', NOW()),
    (jane_id, 'jane_smith', 'active', NOW()),
    (mike_id, 'mike_wilson', 'active', NOW()),
    (sarah_id, 'sarah_jones', 'active', NOW()),
    (alex_id, 'alex_brown', 'active', NOW());

  -- Insert sample messages
  WITH message_inserts AS (
    INSERT INTO messages (id, sender_id, content, created_at)
    VALUES
      (gen_random_uuid(), john_id, 'This is completely inappropriate content that violates community guidelines!', NOW() - INTERVAL '2 hours'),
      (gen_random_uuid(), jane_id, 'You''re all stupid and should leave this platform!', NOW() - INTERVAL '3 hours'),
      (gen_random_uuid(), mike_id, 'I''m going to find where you live and hurt you!', NOW() - INTERVAL '4 hours'),
      (gen_random_uuid(), sarah_id, 'Stop spreading fake information about mental health!', NOW() - INTERVAL '5 hours'),
      (gen_random_uuid(), alex_id, '@everyone Click here to win free money: http://scam-site.com', NOW() - INTERVAL '6 hours')
    RETURNING id, content, sender_id
  )
  -- Insert reports for these messages
  INSERT INTO reported_messages (id, message_id, reported_by, reason, status, created_at, resolved_at, notes)
  SELECT
    gen_random_uuid(),
    m.id,
    CASE 
      WHEN m.sender_id = john_id THEN jane_id
      WHEN m.sender_id = jane_id THEN mike_id
      WHEN m.sender_id = mike_id THEN sarah_id
      WHEN m.sender_id = sarah_id THEN alex_id
      ELSE john_id
    END,
    CASE 
      WHEN m.content LIKE '%inappropriate content%' THEN 'Inappropriate content and harassment'
      WHEN m.content LIKE '%stupid%' THEN 'Harassment and bullying'
      WHEN m.content LIKE '%hurt you%' THEN 'Threats of violence'
      WHEN m.content LIKE '%fake information%' THEN 'Misinformation about mental health'
      ELSE 'Spam and potential scam'
    END,
    CASE 
      WHEN m.content LIKE '%inappropriate content%' THEN 'pending'
      WHEN m.content LIKE '%stupid%' THEN 'resolved'
      WHEN m.content LIKE '%hurt you%' THEN 'pending'
      WHEN m.content LIKE '%fake information%' THEN 'dismissed'
      ELSE 'resolved'
    END,
    CASE 
      WHEN m.content LIKE '%inappropriate content%' THEN NOW() - INTERVAL '1 hour'
      WHEN m.content LIKE '%stupid%' THEN NOW() - INTERVAL '2 hours'
      WHEN m.content LIKE '%hurt you%' THEN NOW() - INTERVAL '3 hours'
      WHEN m.content LIKE '%fake information%' THEN NOW() - INTERVAL '4 hours'
      ELSE NOW() - INTERVAL '5 hours'
    END,
    CASE 
      WHEN m.content LIKE '%stupid%' THEN NOW() - INTERVAL '1 hour'
      WHEN m.content LIKE '%fake information%' THEN NOW() - INTERVAL '3 hours'
      WHEN m.content LIKE '%scam%' THEN NOW() - INTERVAL '4 hours'
      ELSE NULL
    END,
    CASE 
      WHEN m.content LIKE '%stupid%' THEN 'User warned. Content violates community guidelines.'
      WHEN m.content LIKE '%fake information%' THEN 'Content reviewed. No violation found.'
      WHEN m.content LIKE '%scam%' THEN 'User banned for spamming and posting malicious links.'
      ELSE NULL
    END
  FROM message_inserts m;
END $$;