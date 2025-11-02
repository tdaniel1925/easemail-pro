#!/usr/bin/env node

/**
 * Generate Security Keys for EaseMail
 * Run: node generate-keys.js
 */

const crypto = require('crypto');

console.log('\n🔐 EASEMAIL SECURITY KEYS\n');
console.log('═'.repeat(60));
console.log('\n📧 EMAIL ENCRYPTION KEY (32 characters):');
console.log('Add to .env.local as: EMAIL_ENCRYPTION_KEY=...\n');

const emailKey = crypto.randomBytes(32).toString('base64').slice(0, 32);
console.log(emailKey);

console.log('\n' + '═'.repeat(60));
console.log('\n🔒 WEBHOOK SECRET (64 characters):');
console.log('Add to .env.local as: WEBHOOK_SECRET=...\n');

const webhookSecret = crypto.randomBytes(32).toString('hex');
console.log(webhookSecret);

console.log('\n' + '═'.repeat(60));
console.log('\n✅ Copy these to your .env.local file!\n');
console.log('⚠️  NEVER commit these to git or share them publicly!\n');

