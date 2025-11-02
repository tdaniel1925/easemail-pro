#!/usr/bin/env node

/**
 * Safe Dev Server Startup Script
 * Prevents CSS styling issues during restarts
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting EaseMail Development Server...\n');

// Step 1: Kill any existing Node processes
console.log('1️⃣ Cleaning up existing processes...');
try {
  if (process.platform === 'win32') {
    execSync('taskkill /F /IM node.exe 2>nul', { stdio: 'ignore' });
  } else {
    execSync('pkill -9 node', { stdio: 'ignore' });
  }
  console.log('   ✓ Existing processes cleaned\n');
} catch (e) {
  console.log('   ✓ No existing processes to clean\n');
}

// Step 2: Clean build cache
console.log('2️⃣ Cleaning build cache...');
const nextDir = path.join(__dirname, '.next');
try {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('   ✓ Cache cleared\n');
  } else {
    console.log('   ✓ No cache to clear\n');
  }
} catch (e) {
  console.log('   ⚠️ Could not clear cache (not critical)\n');
}

// Step 3: Wait for cleanup
console.log('3️⃣ Waiting for cleanup to complete...');
setTimeout(() => {
  console.log('   ✓ Ready to start\n');

  // Step 4: Start the dev server
  console.log('4️⃣ Starting Next.js dev server on port 3001...\n');
  console.log('━'.repeat(50));
  
  const devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: '3001' }
  });

  devServer.on('error', (err) => {
    console.error('\n❌ Failed to start dev server:', err);
    process.exit(1);
  });

  devServer.on('exit', (code) => {
    if (code !== 0) {
      console.log(`\n⚠️ Dev server exited with code ${code}`);
    }
    process.exit(code);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    devServer.kill('SIGTERM');
    setTimeout(() => {
      devServer.kill('SIGKILL');
      process.exit(0);
    }, 2000);
  });

}, 2000);

