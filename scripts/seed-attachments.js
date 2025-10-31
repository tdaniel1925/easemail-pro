#!/usr/bin/env node
/**
 * Seed Attachments Script
 * Run: node scripts/seed-attachments.js
 */

require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log('🌱 Starting attachment seed...\n');
  
  const { seedAttachments } = require('../lib/attachments/seed-data');
  await seedAttachments();
  
  console.log('\n✅ Done! Visit http://localhost:3001/attachments to see them.');
}

main().catch(console.error);

