/**
 * Script to create Teams integration tables
 * Run with: node scripts/create-teams-tables.mjs
 */

import { config } from 'dotenv';
import pg from 'pg';

// Load environment variables
config({ path: '.env.local' });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});

async function createTeamsTables() {
  const client = await pool.connect();

  try {
    console.log('Creating Teams integration tables...\n');

    // Create teams_accounts table
    console.log('Creating teams_accounts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        microsoft_user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        tenant_id VARCHAR(255),
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        scopes JSONB,
        sync_status VARCHAR(50) DEFAULT 'idle',
        last_sync_at TIMESTAMP,
        last_error TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✓ teams_accounts created');

    // Create unique index on teams_accounts
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS teams_accounts_user_microsoft_idx
      ON teams_accounts(user_id, microsoft_user_id)
    `);
    console.log('  ✓ teams_accounts unique index created');

    // Create teams_chats table
    console.log('Creating teams_chats table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams_chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES teams_accounts(id) ON DELETE CASCADE,
        teams_chat_id VARCHAR(255) NOT NULL,
        chat_type VARCHAR(50) NOT NULL,
        topic VARCHAR(500),
        web_url TEXT,
        tenant_id VARCHAR(255),
        participants JSONB,
        other_participant_name VARCHAR(255),
        other_participant_email VARCHAR(255),
        last_message_at TIMESTAMP,
        last_message_preview TEXT,
        last_message_sender_name VARCHAR(255),
        unread_count INTEGER DEFAULT 0,
        is_pinned BOOLEAN DEFAULT false,
        is_muted BOOLEAN DEFAULT false,
        is_archived BOOLEAN DEFAULT false,
        teams_created_at TIMESTAMP,
        teams_last_updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✓ teams_chats created');

    // Create unique index on teams_chats
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS teams_chats_account_chat_idx
      ON teams_chats(account_id, teams_chat_id)
    `);
    console.log('  ✓ teams_chats unique index created');

    // Create teams_messages table
    console.log('Creating teams_messages table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID NOT NULL REFERENCES teams_chats(id) ON DELETE CASCADE,
        teams_message_id VARCHAR(255) NOT NULL,
        teams_chat_id VARCHAR(255) NOT NULL,
        sender_id VARCHAR(255),
        sender_name VARCHAR(255),
        sender_email VARCHAR(255),
        body TEXT,
        body_type VARCHAR(50) DEFAULT 'text',
        message_type VARCHAR(50) DEFAULT 'message',
        importance VARCHAR(50) DEFAULT 'normal',
        has_attachments BOOLEAN DEFAULT false,
        attachments JSONB,
        mentions JSONB,
        reactions JSONB,
        reply_to_message_id VARCHAR(255),
        is_read BOOLEAN DEFAULT false,
        is_deleted BOOLEAN DEFAULT false,
        is_edited BOOLEAN DEFAULT false,
        teams_created_at TIMESTAMP,
        teams_last_modified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✓ teams_messages created');

    // Create unique index on teams_messages
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS teams_messages_chat_message_idx
      ON teams_messages(chat_id, teams_message_id)
    `);
    console.log('  ✓ teams_messages unique index created');

    // Create index on teams_messages for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS teams_messages_chat_created_idx
      ON teams_messages(chat_id, teams_created_at DESC)
    `);
    console.log('  ✓ teams_messages chat/date index created');

    // Create teams_sync_state table
    console.log('Creating teams_sync_state table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams_sync_state (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES teams_accounts(id) ON DELETE CASCADE,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(255),
        delta_link TEXT,
        skip_token TEXT,
        last_sync_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✓ teams_sync_state created');

    // Create unique index on teams_sync_state
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS teams_sync_state_account_resource_idx
      ON teams_sync_state(account_id, resource_type, resource_id)
    `);
    console.log('  ✓ teams_sync_state unique index created');

    // Create teams_webhook_subscriptions table
    console.log('Creating teams_webhook_subscriptions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams_webhook_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES teams_accounts(id) ON DELETE CASCADE,
        subscription_id VARCHAR(255) NOT NULL,
        resource VARCHAR(500) NOT NULL,
        change_type VARCHAR(100) NOT NULL,
        client_state VARCHAR(255),
        notification_url TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✓ teams_webhook_subscriptions created');

    // Create unique index on teams_webhook_subscriptions
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS teams_webhook_subscriptions_subscription_idx
      ON teams_webhook_subscriptions(subscription_id)
    `);
    console.log('  ✓ teams_webhook_subscriptions unique index created');

    console.log('\n✅ All Teams tables created successfully!');

  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTeamsTables().catch(console.error);
