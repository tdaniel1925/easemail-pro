#!/usr/bin/env node
/**
 * AI Attachments - Quick Test Script
 * 
 * Usage:
 *   node scripts/test-attachments.js status
 *   node scripts/test-attachments.js process
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = process.env.ATTACHMENT_PROCESSING_KEY || 'dev-key';

async function checkStatus() {
  console.log('📊 Checking attachment processing status...\n');
  
  try {
    const response = await fetch(`${API_BASE}/api/attachments/process`);
    const data = await response.json();
    
    console.log('Queue Status:');
    console.log(`  📝 Pending:    ${data.stats.pending}`);
    console.log(`  ⏳ Processing: ${data.stats.processing}`);
    console.log(`  ✅ Completed:  ${data.stats.completed}`);
    console.log(`  ❌ Failed:     ${data.stats.failed}`);
    console.log(`  📊 Total:      ${data.stats.total}\n`);
    
    if (data.queue && data.queue.length > 0) {
      console.log('Next in Queue:');
      data.queue.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.filename}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function processAttachments() {
  console.log('🤖 Starting AI processing...\n');
  
  try {
    const response = await fetch(`${API_BASE}/api/attachments/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', data.error);
      return;
    }
    
    console.log(`✅ Processed: ${data.processed} attachments`);
    console.log(`   Succeeded: ${data.succeeded}`);
    console.log(`   Failed:    ${data.failed}\n`);
    
    if (data.results) {
      console.log('Results:');
      data.results.forEach((result, i) => {
        const icon = result.success ? '✅' : '❌';
        const type = result.documentType || 'error';
        console.log(`  ${icon} ${result.filename} → ${type}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function getStats() {
  console.log('📊 Fetching attachment statistics...\n');
  
  try {
    const response = await fetch(`${API_BASE}/api/attachments/stats`);
    const data = await response.json();
    
    const stats = data.stats;
    
    console.log('Overview:');
    console.log(`  Total Attachments: ${stats.totalAttachments}`);
    console.log(`  Total Size:        ${formatBytes(stats.totalSizeBytes)}`);
    console.log(`  AI Processed:      ${stats.aiProcessedCount}\n`);
    
    console.log('Document Types:');
    Object.entries(stats.documentTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\nTop Senders:');
    stats.topSenders.slice(0, 5).forEach((sender, i) => {
      console.log(`  ${i + 1}. ${sender.name || sender.email} (${sender.count})`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Main
const command = process.argv[2];

switch (command) {
  case 'status':
    checkStatus();
    break;
  case 'process':
    processAttachments();
    break;
  case 'stats':
    getStats();
    break;
  default:
    console.log(`
🤖 AI Attachments Test Script

Usage:
  node scripts/test-attachments.js <command>

Commands:
  status   - Check processing queue status
  process  - Run AI processing on pending attachments
  stats    - View attachment statistics

Examples:
  node scripts/test-attachments.js status
  node scripts/test-attachments.js process
  node scripts/test-attachments.js stats

Environment Variables:
  NEXT_PUBLIC_API_URL         - API base URL (default: http://localhost:3001)
  ATTACHMENT_PROCESSING_KEY   - API key for processing
    `);
}

