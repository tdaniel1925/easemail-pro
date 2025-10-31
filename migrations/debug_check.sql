-- First, let's check what exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('attachments', 'user_preferences');

-- Check attachments columns if it exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'attachments'
ORDER BY ordinal_position;

-- Check user_preferences columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;

