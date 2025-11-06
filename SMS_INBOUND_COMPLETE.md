# 📱 Inbound SMS System - Complete Implementation

## ✅ What Was Built

A complete **two-way SMS messaging system** that routes incoming text message replies from contacts back to the correct user's account and displays them in a unified communication timeline.

---

## 🎯 Features

### **Inbound SMS Routing**
- ✅ Contacts can reply to SMS messages
- ✅ Replies automatically route to the correct user (even with shared Twilio numbers)
- ✅ All messages appear in contact's communication timeline
- ✅ Visual distinction between sent (↑) and received (↓) messages

### **Conversation Tracking**
- ✅ Database tracks active SMS conversations by phone number pair
- ✅ Automatic conversation creation when user sends first SMS
- ✅ Intelligent routing based on most recent conversation
- ✅ Fallback to contact phone lookup if conversation expired

### **Cleanup & Maintenance**
- ✅ Automatic cleanup of inactive conversations (> 30 days)
- ✅ Daily cron job prevents database bloat
- ✅ Manual cleanup endpoint for testing

---

## 📊 How It Works

### **End-to-End Flow**

```
1. User sends SMS to contact
   ↓
2. System creates conversation record:
   - user_id
   - contact_id  
   - contact_phone (+1234567890)
   - twilio_number (+1555000111)
   - last_message_at
   ↓
3. Contact replies to the Twilio number
   ↓
4. Twilio forwards reply to webhook:
   /api/webhooks/twilio/inbound
   ↓
5. Webhook looks up conversation:
   WHERE contact_phone = from
   AND twilio_number = to
   ↓
6. Routes reply to correct user:
   - Saves to sms_messages (direction: 'inbound')
   - Adds to contact_communications (type: 'sms_received')
   - Updates conversation last_message_at
   ↓
7. User sees reply in Contact Panel > Communications tab
```

---

## 🗂️ Database Schema

### **New Table: `sms_conversations`**

```sql
CREATE TABLE sms_conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,  -- Contact's phone in E.164
  twilio_number VARCHAR(50) NOT NULL,  -- Your Twilio number
  last_message_at TIMESTAMP NOT NULL,   -- For cleanup/sorting
  message_count INTEGER DEFAULT 1,      -- Total messages exchanged
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(contact_phone, twilio_number) -- One conversation per phone pair
);
```

**Purpose:** Maps phone number pairs to users for routing inbound SMS.

**Indexes:**
- `contact_phone` - Fast lookup when SMS arrives
- `twilio_number` - Filter by Twilio number (if multiple)
- `last_message_at` - Find most recent conversations
- `user_id` - User's active conversations
- `contact_id` - Contact's conversation history

---

## 📁 Files Created/Modified

### **New Files:**

1. **`lib/db/schema.ts`** (modified)
   - Added `smsConversations` table schema
   - Unique constraint on phone pair
   - Proper indexes for fast lookups

2. **`migrations/030_add_sms_conversations.sql`**
   - SQL migration for conversation tracking table
   - Run in Supabase SQL Editor

3. **`app/api/migrations/030/route.ts`**
   - API endpoint to run migration
   - Creates table and indexes

4. **`app/api/sms/send/route.ts`** (modified)
   - Now tracks conversations when sending SMS
   - Creates/updates conversation record
   - Increments message count

5. **`app/api/webhooks/twilio/inbound/route.ts`** (new)
   - Receives incoming SMS from Twilio
   - Routes to correct user via conversation lookup
   - Saves inbound SMS to database
   - Adds to communication timeline
   - Updates conversation tracking

6. **`app/api/cron/cleanup-sms-conversations/route.ts`** (new)
   - Daily cron job
   - Deletes conversations inactive > 30 days
   - Prevents database bloat

7. **`vercel.json`** (modified)
   - Added cron schedule for cleanup job
   - Runs daily at 3 AM

8. **`SMS_INBOUND_COMPLETE.md`** (this file)
   - Complete documentation
   - Setup instructions
   - Testing guide

---

## 🚀 Setup Instructions

### **Step 1: Run Database Migration**

**Option A: Via API Endpoint**
```bash
curl -X POST https://www.easemail.app/api/migrations/030
```

**Option B: Via Supabase SQL Editor**
1. Go to Supabase Dashboard → SQL Editor
2. Paste contents of `migrations/030_add_sms_conversations.sql`
3. Run query

**Verify:**
```sql
SELECT * FROM sms_conversations LIMIT 1;
```

---

### **Step 2: Configure Twilio Webhook**

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click on your active Twilio phone number
3. Scroll to **"Messaging Configuration"**
4. Under **"A MESSAGE COMES IN"**:
   - **Webhook URL:** `https://www.easemail.app/api/webhooks/twilio/inbound`
   - **HTTP Method:** `POST`
5. Click **Save**

**Verify Configuration:**
```bash
curl https://www.easemail.app/api/webhooks/twilio/inbound
```

Should return:
```json
{
  "service": "Twilio Inbound SMS Webhook",
  "status": "active",
  "endpoint": "/api/webhooks/twilio/inbound"
}
```

---

### **Step 3: Test Inbound SMS**

1. **Send SMS from EaseMail:**
   - Go to Contacts
   - Click on a contact
   - Send SMS: "Testing inbound SMS"
   
2. **Verify conversation created:**
   ```sql
   SELECT * FROM sms_conversations
   WHERE contact_phone = '+1234567890'
   ORDER BY last_message_at DESC;
   ```

3. **Reply from contact's phone:**
   - Use your actual phone to reply to the Twilio number
   - Send: "This is my reply!"

4. **Check inbound SMS saved:**
   ```sql
   SELECT * FROM sms_messages
   WHERE direction = 'inbound'
   ORDER BY created_at DESC;
   ```

5. **View in Communication Timeline:**
   - Go to Contact Panel → Communications tab
   - You should see both messages:
     - ↑ Sent: "Testing inbound SMS"
     - ↓ Received: "This is my reply!"

---

## 📊 Monitoring & Logs

### **Vercel Logs**

When an inbound SMS arrives, you'll see:

```
📥 Inbound SMS received: {
  sid: 'SMxxxxxx',
  from: '+1234567890',
  to: '+1555000111',
  preview: 'This is my reply!...'
}
🔍 Looking up conversation mapping...
✅ Routed inbound SMS: {
  userId: 'abc-123',
  contactId: 'def-456',
  messageCount: 3
}
✅ Inbound SMS saved to database: xyz-789
✅ Added to communication timeline
✅ Conversation tracking updated
✅ Audit log created
```

### **Check Conversation Routing**

```sql
-- See all active conversations
SELECT 
  c.contact_phone,
  c.twilio_number,
  u.email as user_email,
  co.first_name || ' ' || co.last_name as contact_name,
  c.message_count,
  c.last_message_at
FROM sms_conversations c
JOIN users u ON u.id = c.user_id
JOIN contacts co ON co.id = c.contact_id
ORDER BY c.last_message_at DESC;
```

### **View Inbound Messages**

```sql
-- See all received SMS
SELECT 
  sm.from_phone,
  sm.message_body,
  sm.sent_at,
  c.first_name || ' ' || c.last_name as contact_name,
  u.email as user_email
FROM sms_messages sm
JOIN contacts c ON c.id = sm.contact_id
JOIN users u ON u.id = sm.user_id
WHERE sm.direction = 'inbound'
ORDER BY sm.sent_at DESC
LIMIT 20;
```

---

## 🎯 Timeline Display

The **Communication Timeline** automatically shows inbound SMS:

**Before:**
```
┌────────────────────────────────────────┐
│ Type  │ Direction │ Message            │
├────────────────────────────────────────┤
│ SMS   │ ↑ Sent    │ "Are you coming?" │
└────────────────────────────────────────┘
```

**After (with inbound SMS):**
```
┌────────────────────────────────────────────────┐
│ Type  │ Direction  │ Message                   │
├────────────────────────────────────────────────┤
│ SMS   │ ↓ Received │ "Yes, I'll be there!"    │
│ SMS   │ ↑ Sent     │ "Great! See you at 3pm"  │
│ SMS   │ ↓ Received │ "Perfect, thanks!"       │
│ SMS   │ ↑ Sent     │ "Are you coming?"        │
└────────────────────────────────────────────────┘
```

The timeline already has full support - **no UI changes needed!**

---

## 🔧 Advanced Configuration

### **Multi-User Shared Twilio Number**

The system automatically handles multiple users sharing one Twilio number:

1. **User A** sends SMS to **Contact X** → Creates conversation mapping
2. **Contact X** replies → Routes to **User A** (via conversation lookup)
3. **User B** sends SMS to **Contact Y** → Creates separate conversation mapping
4. **Contact Y** replies → Routes to **User B**

**Even if User A and User B both have Contact X:**
- Whichever user messaged most recently receives the reply
- Based on `last_message_at` timestamp

---

### **Conversation Expiry**

**Default:** 30 days of inactivity

**To adjust:**
```typescript
// In app/api/cron/cleanup-sms-conversations/route.ts
const daysInactive = 30; // Change this value
```

**Manual cleanup:**
```bash
curl -X POST https://www.easemail.app/api/cron/cleanup-sms-conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -d '{"daysInactive": 60}'
```

---

### **Fallback Contact Matching**

If no conversation is found, the system tries to match by:
1. Exact phone match: `+1234567890`
2. Without + prefix: `1234567890`
3. Digits only: `234567890`

**Then creates a new conversation mapping automatically.**

---

## 🔒 Security Features

### **1. Twilio Signature Verification** (Optional)

To enable signature verification:

```typescript
// In app/api/webhooks/twilio/inbound/route.ts
import twilio from 'twilio';

function verifyTwilioSignature(request: NextRequest, body: any): boolean {
  const signature = request.headers.get('X-Twilio-Signature');
  const url = request.url;
  
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature!,
    url,
    body
  );
}
```

### **2. Cron Job Authorization**

Protected by `CRON_SECRET` environment variable:

```bash
# Add to .env.local and Vercel
CRON_SECRET=your-random-secret-here
```

### **3. Data Isolation**

- All queries filtered by `user_id`
- Row Level Security (RLS) enforced
- No cross-user data leakage

---

## 📈 Usage Analytics

### **Track Inbound SMS Volume**

```sql
SELECT 
  DATE_TRUNC('day', sent_at) as date,
  COUNT(*) as inbound_count
FROM sms_messages
WHERE direction = 'inbound'
GROUP BY date
ORDER BY date DESC
LIMIT 30;
```

### **Most Active Conversations**

```sql
SELECT 
  c.first_name || ' ' || c.last_name as contact_name,
  sc.message_count,
  sc.last_message_at,
  EXTRACT(EPOCH FROM (NOW() - sc.last_message_at))/86400 as days_since_last
FROM sms_conversations sc
JOIN contacts c ON c.id = sc.contact_id
WHERE sc.user_id = 'YOUR_USER_ID'
ORDER BY sc.message_count DESC
LIMIT 10;
```

### **Response Rate**

```sql
WITH outbound AS (
  SELECT contact_id, COUNT(*) as sent
  FROM sms_messages
  WHERE direction = 'outbound'
  GROUP BY contact_id
),
inbound AS (
  SELECT contact_id, COUNT(*) as received
  FROM sms_messages
  WHERE direction = 'inbound'
  GROUP BY contact_id
)
SELECT 
  c.first_name || ' ' || c.last_name as contact,
  o.sent,
  COALESCE(i.received, 0) as received,
  ROUND(COALESCE(i.received, 0)::numeric / o.sent * 100, 1) as response_rate
FROM outbound o
JOIN contacts c ON c.id = o.contact_id
LEFT JOIN inbound i ON i.contact_id = o.contact_id
ORDER BY response_rate DESC;
```

---

## 🐛 Troubleshooting

### **Issue: Inbound SMS not appearing**

**Check 1: Twilio webhook configured?**
```bash
curl https://www.easemail.app/api/webhooks/twilio/inbound
```

**Check 2: Conversation exists?**
```sql
SELECT * FROM sms_conversations 
WHERE contact_phone = '+1234567890';
```

**Check 3: Vercel logs**
- Go to Vercel Dashboard → Logs
- Filter by `/api/webhooks/twilio/inbound`
- Look for errors

**Check 4: Contact exists in database?**
```sql
SELECT * FROM contacts WHERE phone LIKE '%234567890%';
```

---

### **Issue: Wrong user receiving SMS**

**Check conversation mapping:**
```sql
SELECT 
  sc.*,
  u.email as user_email
FROM sms_conversations sc
JOIN users u ON u.id = sc.user_id
WHERE sc.contact_phone = '+1234567890';
```

**If multiple users have same contact:**
- The one who messaged most recently receives replies
- Check `last_message_at` timestamp
- Conversations auto-expire after 30 days

---

### **Issue: Database connection timeout**

**Check connection pool settings:**
```typescript
// In lib/db/drizzle.ts
const client = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});
```

**Use Transaction Mode Pooler:**
- Port 6543 (not 5432)
- Add `?pgbouncer=true`
- Set `prepare: false` in Drizzle config

---

## ✅ Success Checklist

- [ ] Migration 030 ran successfully
- [ ] `sms_conversations` table exists
- [ ] Twilio webhook configured (inbound endpoint)
- [ ] Test SMS sent from EaseMail
- [ ] Conversation record created in database
- [ ] Reply sent from contact's phone
- [ ] Inbound SMS saved to `sms_messages`
- [ ] Reply appears in Communication Timeline
- [ ] Conversation `last_message_at` updated
- [ ] Cron job configured in `vercel.json`
- [ ] CRON_SECRET set in environment variables

---

## 🎉 You're Done!

Your EaseMail application now supports **full two-way SMS messaging**!

### **Key Benefits:**

✅ **Unified Communication Timeline** - All SMS in one place
✅ **Intelligent Routing** - Replies go to correct user automatically
✅ **Scales with Multiple Users** - Works with shared Twilio numbers
✅ **Auto-Cleanup** - No database bloat from old conversations
✅ **Complete Audit Trail** - Every message logged
✅ **Professional UX** - Visual sent/received indicators

---

## 📚 Related Documentation

- **SMS System Overview:** `SMS_COMPLETE.md`
- **Contact System:** `CONTACTS_SMS_FEATURE_COMPLETE.md`
- **Communication Timeline:** `components/contacts/CommunicationTimeline.tsx`
- **Twilio Configuration:** `lib/sms/twilio-client-v2.ts`

---

**Need help?** Check Sentry dashboard for errors: https://sentry.io/organizations/bioquest/projects/javascript-nextjs/issues/

**Questions?** Review the Vercel logs or database queries above for debugging.

---

*Built with ❤️ by the EaseMail team*

