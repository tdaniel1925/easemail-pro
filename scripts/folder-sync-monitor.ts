/**
 * Automated Folder Sync Monitor & Healer
 * 
 * Purpose: Continuously monitors for folder assignment issues and automatically
 * fixes them. Can be run as a cron job or background service.
 * 
 * Features:
 * - Detects folder mismatches in real-time
 * - Auto-heals issues (optional)
 * - Sends alerts when issues detected
 * - Tracks metrics and history
 * - Safe with rate limiting
 * 
 * Usage: node --loader tsx scripts/folder-sync-monitor.ts [--auto-heal] [--check-interval=300]
 */

import { db } from '../lib/db/drizzle';
import { emails, emailAccounts } from '../lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { assignEmailFolder, validateFolderAssignment } from '../lib/email/folder-utils';

interface MonitorConfig {
  autoHeal: boolean;
  checkInterval: number; // seconds
  maxHealsPerRun: number;
  alertThreshold: number; // number of mismatches to trigger alert
  slackWebhook?: string;
  emailAlert?: string;
}

interface MonitorStats {
  totalChecked: number;
  issuesDetected: number;
  issuesHealed: number;
  issuesByAccount: Record<string, number>;
  issuesByFolder: Record<string, number>;
  errors: number;
  lastRun: Date;
}

class FolderSyncMonitor {
  private config: MonitorConfig;
  private stats: MonitorStats;
  private isRunning: boolean = false;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = {
      autoHeal: config.autoHeal ?? false,
      checkInterval: config.checkInterval ?? 300, // 5 minutes default
      maxHealsPerRun: config.maxHealsPerRun ?? 1000,
      alertThreshold: config.alertThreshold ?? 50,
      slackWebhook: config.slackWebhook || process.env.SLACK_WEBHOOK_URL,
      emailAlert: config.emailAlert || process.env.ALERT_EMAIL,
    };

    this.stats = {
      totalChecked: 0,
      issuesDetected: 0,
      issuesHealed: 0,
      issuesByAccount: {},
      issuesByFolder: {},
      errors: 0,
      lastRun: new Date(),
    };
  }

  /**
   * Start monitoring (runs continuously)
   */
  async start() {
    console.log('🔍 Starting Folder Sync Monitor');
    console.log('================================');
    console.log(`Auto-heal: ${this.config.autoHeal ? 'ENABLED ✅' : 'DISABLED ⚠️'}`);
    console.log(`Check interval: ${this.config.checkInterval}s`);
    console.log(`Alert threshold: ${this.config.alertThreshold} issues`);
    console.log('');

    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.runCheck();
        
        // Wait for next check
        await this.sleep(this.config.checkInterval * 1000);
      } catch (error: any) {
        console.error('❌ Monitor error:', error);
        this.stats.errors++;
        
        // Send alert on critical errors
        await this.sendAlert({
          severity: 'error',
          message: 'Folder sync monitor encountered an error',
          error: error.message,
        });
        
        // Wait before retrying
        await this.sleep(60000); // 1 minute
      }
    }
  }

  /**
   * Run a single check
   */
  async runCheck() {
    console.log(`\n🔍 Running folder sync check at ${new Date().toISOString()}`);
    
    const checkStats = {
      checked: 0,
      issues: 0,
      healed: 0,
    };

    try {
      // Get recent emails (last 24 hours) to check
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentEmails = await db.query.emails.findMany({
        where: gte(emails.createdAt, twentyFourHoursAgo),
        limit: 10000, // Check last 10k emails
      });

      console.log(`   Checking ${recentEmails.length} recent emails...`);

      for (const email of recentEmails) {
        checkStats.checked++;
        
        try {
          const foldersArray = email.folders as string[] | null;
          
          // Skip if no folders array
          if (!foldersArray || foldersArray.length === 0) {
            continue;
          }

          // Calculate what folder should be
          const correctFolder = assignEmailFolder(foldersArray);
          const currentFolder = email.folder;

          // Check for mismatch
          if (currentFolder !== correctFolder) {
            checkStats.issues++;
            this.stats.issuesDetected++;

            // Track by account
            const accountId = email.accountId;
            this.stats.issuesByAccount[accountId] = 
              (this.stats.issuesByAccount[accountId] || 0) + 1;

            // Track by folder
            this.stats.issuesByFolder[correctFolder] = 
              (this.stats.issuesByFolder[correctFolder] || 0) + 1;

            console.log(`   ⚠️  Mismatch detected:`);
            console.log(`      Email ID: ${email.id}`);
            console.log(`      Subject: ${email.subject?.substring(0, 50)}`);
            console.log(`      Current: "${currentFolder}" → Should be: "${correctFolder}"`);

            // Auto-heal if enabled
            if (this.config.autoHeal && checkStats.healed < this.config.maxHealsPerRun) {
              try {
                await db.update(emails)
                  .set({ 
                    folder: correctFolder,
                    updatedAt: new Date(),
                  })
                  .where(eq(emails.id, email.id));

                checkStats.healed++;
                this.stats.issuesHealed++;
                console.log(`      ✅ Auto-healed!`);
              } catch (healError: any) {
                console.error(`      ❌ Failed to heal:`, healError.message);
                this.stats.errors++;
              }
            } else if (!this.config.autoHeal) {
              console.log(`      ℹ️  Auto-heal disabled (use --auto-heal to enable)`);
            }
          }
        } catch (emailError: any) {
          console.error(`   ❌ Error checking email ${email.id}:`, emailError.message);
          this.stats.errors++;
        }
      }

      this.stats.totalChecked += checkStats.checked;
      this.stats.lastRun = new Date();

      // Report results
      console.log(`\n   📊 Check Results:`);
      console.log(`      Checked: ${checkStats.checked} emails`);
      console.log(`      Issues found: ${checkStats.issues}`);
      console.log(`      Healed: ${checkStats.healed}`);
      console.log(`      Errors: ${this.stats.errors}`);

      // Send alert if threshold exceeded
      if (checkStats.issues >= this.config.alertThreshold) {
        await this.sendAlert({
          severity: 'warning',
          message: `Folder sync issues detected: ${checkStats.issues} mismatches found`,
          stats: checkStats,
        });
      }

      // Log cumulative stats every hour
      if (this.shouldLogStats()) {
        this.logCumulativeStats();
      }

    } catch (error: any) {
      console.error('❌ Check failed:', error);
      throw error;
    }
  }

  /**
   * Run once and exit (for cron jobs)
   */
  async runOnce() {
    console.log('🔍 Running single folder sync check');
    await this.runCheck();
    this.logCumulativeStats();
    
    if (this.stats.issuesDetected > 0) {
      process.exit(1); // Exit with error code if issues found
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    console.log('\n🛑 Stopping folder sync monitor...');
    this.isRunning = false;
  }

  /**
   * Send alert via configured channels
   */
  private async sendAlert(alert: {
    severity: 'info' | 'warning' | 'error';
    message: string;
    stats?: any;
    error?: string;
  }) {
    console.log(`\n🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);

    // Slack webhook
    if (this.config.slackWebhook) {
      try {
        const payload = {
          text: `🚨 Folder Sync Alert`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `🚨 ${alert.severity.toUpperCase()}: Folder Sync Alert`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Message:* ${alert.message}`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Issues Detected:* ${this.stats.issuesDetected}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Auto-Healed:* ${this.stats.issuesHealed}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Time:* ${new Date().toISOString()}`,
                },
              ],
            },
          ],
        };

        await fetch(this.config.slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }

    // TODO: Add email alerts, Sentry, etc.
  }

  /**
   * Log cumulative statistics
   */
  private logCumulativeStats() {
    console.log('\n📊 ============================================');
    console.log('📊 Cumulative Statistics');
    console.log('📊 ============================================');
    console.log(`Total emails checked: ${this.stats.totalChecked}`);
    console.log(`Issues detected: ${this.stats.issuesDetected}`);
    console.log(`Issues healed: ${this.stats.issuesHealed}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Last run: ${this.stats.lastRun.toISOString()}`);
    console.log('');
    
    if (Object.keys(this.stats.issuesByAccount).length > 0) {
      console.log('Issues by account:');
      Object.entries(this.stats.issuesByAccount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([accountId, count]) => {
          console.log(`  ${accountId}: ${count} issues`);
        });
      console.log('');
    }

    if (Object.keys(this.stats.issuesByFolder).length > 0) {
      console.log('Issues by target folder:');
      Object.entries(this.stats.issuesByFolder)
        .sort(([, a], [, b]) => b - a)
        .forEach(([folder, count]) => {
          console.log(`  ${folder}: ${count} emails`);
        });
    }
    console.log('📊 ============================================\n');
  }

  /**
   * Check if we should log stats (every hour)
   */
  private shouldLogStats(): boolean {
    const now = Date.now();
    const lastLog = this.stats.lastRun.getTime();
    return now - lastLog >= 3600000; // 1 hour
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config: Partial<MonitorConfig> = {};
  let mode: 'continuous' | 'once' = 'continuous';

  for (const arg of args) {
    if (arg === '--auto-heal') {
      config.autoHeal = true;
    } else if (arg === '--once') {
      mode = 'once';
    } else if (arg.startsWith('--check-interval=')) {
      config.checkInterval = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--alert-threshold=')) {
      config.alertThreshold = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--max-heals=')) {
      config.maxHealsPerRun = parseInt(arg.split('=')[1]);
    } else if (arg === '--help') {
      console.log(`
Folder Sync Monitor - Automated folder assignment monitoring and healing

Usage: node --loader tsx scripts/folder-sync-monitor.ts [options]

Modes:
  (default)         Run continuously with periodic checks
  --once           Run a single check and exit (for cron jobs)

Options:
  --auto-heal                Enable automatic healing of issues
  --check-interval=<sec>     Check interval in seconds (default: 300)
  --alert-threshold=<num>    Number of issues to trigger alert (default: 50)
  --max-heals=<num>          Max heals per run (default: 1000)
  --help                     Show this help

Environment Variables:
  SLACK_WEBHOOK_URL          Slack webhook for alerts
  ALERT_EMAIL                Email address for alerts

Examples:
  # Run continuously with auto-heal
  npm run monitor-folders -- --auto-heal

  # Run once (for cron job) with auto-heal
  npm run monitor-folders -- --once --auto-heal

  # Monitor only (no healing) every 10 minutes
  npm run monitor-folders -- --check-interval=600

  # Custom thresholds
  npm run monitor-folders -- --auto-heal --alert-threshold=100 --max-heals=500

Cron Setup (check every 5 minutes):
  */5 * * * * cd /path/to/app && npm run monitor-folders -- --once --auto-heal >> /var/log/folder-monitor.log 2>&1
      `);
      process.exit(0);
    }
  }

  return { config, mode };
}

// Run if called directly
if (require.main === module) {
  const { config, mode } = parseArgs();
  const monitor = new FolderSyncMonitor(config);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    monitor.stop();
    process.exit(0);
  });

  if (mode === 'once') {
    monitor.runOnce()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  } else {
    monitor.start()
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  }
}

export { FolderSyncMonitor };

