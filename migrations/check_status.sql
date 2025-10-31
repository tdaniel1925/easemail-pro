-- Check if attachments table and AI preference exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attachments') 
    THEN '✅ attachments table exists'
    ELSE '❌ attachments table missing'
  END as attachments_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'ai_attachment_processing') 
    THEN '✅ ai_attachment_processing column exists'
    ELSE '❌ ai_attachment_processing column missing'
  END as ai_column_status;

