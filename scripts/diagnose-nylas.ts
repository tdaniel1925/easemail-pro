/**
 * EaseMail Nylas Diagnostic Tool
 * Simplified version focusing on actual connection issues
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import Nylas from 'nylas';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI!,
});

interface DiagnosticResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: any;
  recommendation?: string;
}

class EaseMailDiagnostic {
  private results: DiagnosticResult[] = [];

  // 1. Check all accounts in database
  async checkDatabaseAccounts(): Promise<void> {
    console.log('\n📊 Checking database accounts...');
    
    try {
      const accounts = await db.select().from(emailAccounts);
      
      if (!accounts || accounts.length === 0) {
        this.results.push({
          check: 'Database Accounts',
          status: 'WARN',
          details: { totalAccounts: 0, message: 'No accounts found in database' },
          recommendation: 'Add email accounts through the UI',
        });
        return;
      }

      this.results.push({
        check: 'Database Accounts',
        status: 'PASS',
        details: {
          totalAccounts: accounts.length,
          accounts: accounts.map(a => ({
            email: a.emailAddress,
            provider: a.emailProvider || a.nylasProvider,
            status: a.syncStatus,
            lastSync: a.lastSyncedAt,
            lastError: a.lastError,
            hasGrantId: !!a.nylasGrantId,
            isActive: a.isActive,
            initialSyncDone: a.initialSyncCompleted,
            emailCount: a.totalEmailCount,
            syncedCount: a.syncedEmailCount,
          })),
        },
      });

      // Check for specific issues
      const inactive = accounts.filter(a => !a.isActive);
      const withErrors = accounts.filter(a => a.lastError);
      const notSynced = accounts.filter(a => !a.initialSyncCompleted);

      if (inactive.length > 0) {
        this.results.push({
          check: 'Inactive Accounts',
          status: 'WARN',
          details: { count: inactive.length, emails: inactive.map(a => a.emailAddress) },
          recommendation: 'Accounts marked as inactive in database',
        });
      }

      if (withErrors.length > 0) {
        this.results.push({
          check: 'Accounts with Errors',
          status: 'FAIL',
          details: withErrors.map(a => ({
            email: a.emailAddress,
            error: a.lastError,
            status: a.syncStatus,
          })),
          recommendation: 'Fix these errors before proceeding',
        });
      }

      if (notSynced.length > 0) {
        this.results.push({
          check: 'Never Synced',
          status: 'WARN',
          details: { count: notSynced.length, emails: notSynced.map(a => a.emailAddress) },
          recommendation: 'Run initial sync for these accounts',
        });
      }

    } catch (error: any) {
      this.results.push({
        check: 'Database Connection',
        status: 'FAIL',
        details: { 
          error: error.message || 'Unknown error',
          stack: error.stack?.split('\n')[0],
          type: error.constructor.name 
        },
        recommendation: 'Check database connection and credentials - ensure DATABASE_URL is set correctly',
      });
    }
  }

  // 2. Check Nylas grants validity
  async checkNylasGrants(): Promise<void> {
    console.log('\n🔑 Checking Nylas grants...');
    
    try {
      const accounts = await db.select().from(emailAccounts);
      const grantsToCheck = accounts.filter(a => a.nylasGrantId);

      for (const account of grantsToCheck) {
        try {
          const startTime = Date.now();
          const grant = await nylas.grants.find({ grantId: account.nylasGrantId! });
          const responseTime = Date.now() - startTime;

          const isValid = grant.data?.grantStatus === 'valid';

          this.results.push({
            check: `Grant: ${account.emailAddress}`,
            status: isValid ? 'PASS' : 'FAIL',
            details: {
              grantId: account.nylasGrantId,
              status: grant.data?.grantStatus,
              provider: grant.data?.provider,
              email: grant.data?.email,
              scopes: grant.data?.scope,
              responseTime: `${responseTime}ms`,
              createdAt: grant.data?.createdAt,
              updatedAt: grant.data?.updatedAt,
            },
            recommendation: isValid ? undefined : 'Grant needs re-authentication',
          });

          // Check response time
          if (responseTime > 5000) {
            this.results.push({
              check: `API Response Time: ${account.emailAddress}`,
              status: 'WARN',
              details: { responseTime: `${responseTime}ms`, threshold: '5000ms' },
              recommendation: 'Nylas API is slow - consider increasing health check timeout',
            });
          }

        } catch (error: any) {
          this.results.push({
            check: `Grant Check Failed: ${account.emailAddress}`,
            status: 'FAIL',
            details: {
              grantId: account.nylasGrantId,
              error: error.message,
              statusCode: error.status || error.statusCode,
            },
            recommendation: 'Re-authenticate this account',
          });
        }
      }

    } catch (error: any) {
      this.results.push({
        check: 'Nylas API Connection',
        status: 'FAIL',
        details: { error: error.message },
        recommendation: 'Check NYLAS_API_KEY and NYLAS_API_URI environment variables',
      });
    }
  }

  // 3. Test Nylas API endpoints with timing
  async testNylasEndpoints(): Promise<void> {
    console.log('\n🌐 Testing Nylas API endpoints...');
    
    try {
      const startTime = Date.now();
      
      // Just test if we can reach the API
      await nylas.grants.list({ limit: 1 });
      
      const responseTime = Date.now() - startTime;

      this.results.push({
        check: 'API Endpoint: Grants API',
        status: responseTime < 5000 ? 'PASS' : 'WARN',
        details: { responseTime: `${responseTime}ms` },
        recommendation: responseTime > 5000 ? 'API is slow - this will cause health check failures' : undefined,
      });

    } catch (error: any) {
      this.results.push({
        check: 'API Endpoint: Grants API',
        status: 'FAIL',
        details: { error: error.message },
        recommendation: 'Check Nylas API credentials and network connectivity',
      });
    }
  }

  // 4. Check for duplicate webhooks
  async checkWebhooks(): Promise<void> {
    console.log('\n🪝 Checking webhooks...');
    
    try {
      const webhooks = await nylas.webhooks.list();
      
      // Check if data exists and is iterable
      if (!webhooks || !webhooks.data || !Array.isArray(webhooks.data)) {
        this.results.push({
          check: 'Webhooks',
          status: 'WARN',
          details: { message: 'No webhooks data returned or invalid format' },
          recommendation: 'Webhook API may not be accessible',
        });
        return;
      }

      // Group by callback URL
      const grouped = new Map<string, any[]>();
      for (const webhook of webhooks.data) {
        const url = webhook.webhookUrl;
        if (!grouped.has(url)) {
          grouped.set(url, []);
        }
        grouped.get(url)!.push(webhook);
      }

      const duplicates = Array.from(grouped.entries()).filter(([_, hooks]) => hooks.length > 1);

      this.results.push({
        check: 'Webhooks',
        status: duplicates.length > 0 ? 'WARN' : 'PASS',
        details: {
          total: webhooks.data.length,
          unique: grouped.size,
          duplicates: duplicates.length,
          webhooks: webhooks.data.map(w => ({
            id: w.id,
            url: w.webhookUrl,
            triggers: w.triggerTypes,
            status: w.webhookSecret ? 'configured' : 'missing_secret',
          })),
        },
        recommendation: duplicates.length > 0 ? 'Delete duplicate webhooks' : undefined,
      });

      if (duplicates.length > 0) {
        this.results.push({
          check: 'Duplicate Webhooks',
          status: 'WARN',
          details: {
            duplicates: duplicates.map(([url, hooks]) => ({
              url,
              count: hooks.length,
              ids: hooks.map(h => h.id),
            })),
          },
          recommendation: 'Keep newest webhook for each URL, delete the rest',
        });
      }

    } catch (error: any) {
      this.results.push({
        check: 'Webhook Check',
        status: 'WARN',
        details: { error: error.message },
        recommendation: 'Webhook check failed - may not have webhooks configured yet',
      });
    }
  }

  // 5. Check environment variables
  async checkEnvironment(): Promise<void> {
    console.log('\n⚙️  Checking environment...');
    
    const required = [
      'NYLAS_API_KEY',
      'NYLAS_API_URI',
      'NYLAS_CLIENT_ID',
      'NEXT_PUBLIC_APP_URL',
      'DATABASE_URL',
    ];

    const missing = required.filter(key => !process.env[key]);
    const present = required.filter(key => process.env[key]);

    this.results.push({
      check: 'Environment Variables',
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      details: {
        present: present.length,
        missing: missing.length,
        missingVars: missing,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        apiUri: process.env.NYLAS_API_URI,
      },
      recommendation: missing.length > 0 ? `Set missing variables: ${missing.join(', ')}` : undefined,
    });

    // Check NEXT_PUBLIC_APP_URL specifically
    if (process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') && process.env.NODE_ENV === 'production') {
      this.results.push({
        check: 'App URL Configuration',
        status: 'WARN',
        details: { url: process.env.NEXT_PUBLIC_APP_URL, env: process.env.NODE_ENV },
        recommendation: 'Using localhost URL in production - OAuth callbacks may fail',
      });
    }
  }

  // 6. Check folder sync status
  async checkFolderSync(): Promise<void> {
    console.log('\n📁 Checking folder sync...');
    
    try {
      const accounts = await db.select().from(emailAccounts);
      
      for (const account of accounts) {
        try {
          const folders = await db.query.emailFolders?.findMany({
            where: (folders: any, { eq }: any) => eq(folders.accountId, account.id),
          });

          this.results.push({
            check: `Folders: ${account.emailAddress}`,
            status: folders && folders.length > 0 ? 'PASS' : 'WARN',
            details: {
              folderCount: folders?.length || 0,
              folders: folders?.map((f: any) => ({ name: f.displayName, type: f.folderType })),
            },
            recommendation: !folders || folders.length === 0 ? 'Folders not synced - run folder sync' : undefined,
          });
        } catch (error) {
          this.results.push({
            check: `Folders: ${account.emailAddress}`,
            status: 'WARN',
            details: { error: 'Could not query folders' },
            recommendation: 'Folder sync may not have run yet',
          });
        }
      }
    } catch (error: any) {
      this.results.push({
        check: 'Folder Sync',
        status: 'WARN',
        details: { error: error.message },
        recommendation: 'emailFolders table may not exist or query failed',
      });
    }
  }

  // Main diagnostic runner
  async runDiagnostic(): Promise<void> {
    console.log('🚀 EaseMail Nylas Diagnostic Tool');
    console.log('==================================\n');

    await this.checkEnvironment();
    await this.checkDatabaseAccounts();
    await this.testNylasEndpoints();
    await this.checkNylasGrants();
    await this.checkWebhooks();
    await this.checkFolderSync();

    this.printResults();
    this.printSummary();
  }

  private printResults(): void {
    console.log('\n\n📋 DIAGNOSTIC RESULTS');
    console.log('==================================\n');

    for (const result of this.results) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
      console.log(`${icon} ${result.check}`);
      console.log(`   Status: ${result.status}`);
      
      if (result.recommendation) {
        console.log(`   ➡️  ${result.recommendation}`);
      }
      
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      console.log('');
    }
  }

  private printSummary(): void {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const warned = this.results.filter(r => r.status === 'WARN').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;

    console.log('\n\n📊 SUMMARY');
    console.log('==================================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warned}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📝 Total Checks: ${this.results.length}`);

    if (failed > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`   ❌ ${r.check}: ${r.recommendation || 'See details above'}`);
        });
    }

    if (warned > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results
        .filter(r => r.status === 'WARN')
        .forEach(r => {
          console.log(`   ⚠️  ${r.check}: ${r.recommendation || 'See details above'}`);
        });
    }
  }
}

// Export for direct execution
export async function runDiagnostic() {
  const diagnostic = new EaseMailDiagnostic();
  await diagnostic.runDiagnostic();
}

// CLI execution
if (require.main === module) {
  runDiagnostic()
    .then(() => {
      console.log('\n✅ Diagnostic complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Diagnostic failed:', error);
      process.exit(1);
    });
}

