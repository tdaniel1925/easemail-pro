/**
 * Migration Script: Analyze and Link Existing Emails into Threads
 * 
 * This script processes all existing emails in the database and:
 * 1. Detects which emails belong to the same thread
 * 2. Creates thread records
 * 3. Links emails to threads
 * 4. Generates AI summaries for threads (optional)
 * 
 * Usage:
 *   npx tsx scripts/migrate-email-threads.ts [--generate-summaries]
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

import { db } from '../lib/db/drizzle';
import { emails, emailThreads } from '../lib/db/schema';
import { ThreadingService } from '../lib/email/threading-service';
import { eq, isNull, sql } from 'drizzle-orm';

async function migrateEmailThreads(options: { generateSummaries?: boolean } = {}) {
  console.log('🔄 Starting email threading migration...\n');

  try {
    // Get all users with emails
    const usersWithEmails = await db
      .select({
        userId: emails.accountId,
        userCount: sql<number>`count(distinct ${emails.accountId})::int`,
      })
      .from(emails)
      .groupBy(emails.accountId);

    console.log(`📊 Found ${usersWithEmails.length} users with emails\n`);

    for (const userRow of usersWithEmails) {
      const userId = userRow.userId;
      
      // Get all emails for this user that don't have a threadId yet
      const userEmails = await db.query.emails.findMany({
        where: eq(emails.accountId, userId),
        orderBy: [sql`${emails.receivedAt} ASC`],
      });

      console.log(`\n👤 Processing user ${userId}`);
      console.log(`   📧 Total emails: ${userEmails.length}`);

      let threadsCreated = 0;
      let emailsLinked = 0;
      const processedEmails = new Set<string>();

      // Process emails in chronological order
      for (const email of userEmails) {
        if (processedEmails.has(email.id)) {
          continue;
        }

        try {
          // Detect thread for this email
          const threadDetection = await ThreadingService.detectThread(email as any, userId);

          let threadId: string;

          if (threadDetection.isNewThread) {
            // Create new thread
            threadId = await ThreadingService.createThread(email as any, userId);
            threadsCreated++;
            console.log(`   ✨ Created new thread: ${threadId.substring(0, 8)}... (${email.subject})`);
          } else if (threadDetection.threadId) {
            // Add to existing thread
            threadId = threadDetection.threadId;
            await ThreadingService.addToThread(threadId, email as any);
            console.log(`   🔗 Added to thread: ${threadId.substring(0, 8)}... (${email.subject})`);
          } else {
            // Shouldn't happen, but handle gracefully
            threadId = await ThreadingService.createThread(email as any, userId);
            threadsCreated++;
          }

          // Update email with threadId
          await db
            .update(emails)
            .set({ threadId, updatedAt: new Date() })
            .where(eq(emails.id, email.id));

          emailsLinked++;
          processedEmails.add(email.id);

          // Log progress every 10 emails
          if (emailsLinked % 10 === 0) {
            console.log(`   📈 Progress: ${emailsLinked}/${userEmails.length} emails processed`);
          }
        } catch (error) {
          console.error(`   ❌ Error processing email ${email.id}:`, error);
          // Continue with next email
        }
      }

      console.log(`\n   ✅ User ${userId} complete:`);
      console.log(`      - Threads created: ${threadsCreated}`);
      console.log(`      - Emails linked: ${emailsLinked}`);

      // Generate AI summaries if requested
      if (options.generateSummaries) {
        console.log(`\n   🤖 Generating AI summaries for threads...`);
        
        const userThreads = await db.query.emailThreads.findMany({
          where: eq(emailThreads.userId, userId),
        });

        let summariesGenerated = 0;

        for (const thread of userThreads) {
          try {
            await ThreadingService.generateThreadSummary(thread.id);
            summariesGenerated++;
            
            if (summariesGenerated % 5 === 0) {
              console.log(`      📝 Generated ${summariesGenerated}/${userThreads.length} summaries`);
            }
          } catch (error) {
            console.error(`      ❌ Error generating summary for thread ${thread.id}:`, error);
          }
        }

        console.log(`      ✅ Generated ${summariesGenerated} thread summaries`);
      }
    }

    // Final statistics
    const stats = await db
      .select({
        totalEmails: sql<number>`count(*)::int`,
        linkedEmails: sql<number>`count(*) filter (where ${emails.threadId} is not null)::int`,
        totalThreads: sql<number>`(select count(*) from email_threads)::int`,
      })
      .from(emails);

    console.log('\n\n📊 Migration Complete!');
    console.log('═══════════════════════════════════════');
    console.log(`Total emails: ${stats[0].totalEmails}`);
    console.log(`Emails linked to threads: ${stats[0].linkedEmails}`);
    console.log(`Total threads created: ${stats[0].totalThreads}`);
    console.log(`Success rate: ${((stats[0].linkedEmails / stats[0].totalEmails) * 100).toFixed(2)}%`);
    console.log('═══════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const generateSummaries = args.includes('--generate-summaries');

// Run migration
migrateEmailThreads({ generateSummaries })
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

