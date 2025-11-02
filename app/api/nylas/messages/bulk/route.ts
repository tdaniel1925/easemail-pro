/**
 * Bulk Actions API
 * POST /api/nylas/messages/bulk
 * 
 * Perform actions on multiple emails at once
 */

import { NextRequest, NextResponse } from 'next/server';
import { nylas } from '@/lib/email/nylas-client';
import { db } from '@/lib/db/drizzle';
import { emails } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { messageIds, action, value } = await request.json();

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'No messages selected' },
        { status: 400 }
      );
    }

    console.log(`📦 Bulk action: ${action} on ${messageIds.length} messages`);

    // Get all messages with their accounts
    const messages = await db.query.emails.findMany({
      where: inArray(emails.id, messageIds),
      with: { account: true },
    });

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found' },
        { status: 404 }
      );
    }

    // Group messages by account (for efficiency)
    const messagesByAccount = messages.reduce((acc, msg) => {
      const grantId = msg.account?.nylasGrantId;
      if (!grantId) return acc;
      if (!acc[grantId]) acc[grantId] = [];
      acc[grantId].push(msg);
      return acc;
    }, {} as Record<string, typeof messages>);

    let successCount = 0;
    let errorCount = 0;

    // Process each account's messages
    for (const [grantId, accountMessages] of Object.entries(messagesByAccount)) {
      for (const message of accountMessages) {
        try {
          switch (action) {
            case 'delete':
              console.log(`🗑️  Deleting email: ${message.id} (provider: ${message.providerMessageId})`);
              
              // Move to trash in database AND Nylas
              await db.update(emails)
                .set({
                  isTrashed: true,
                  folder: 'trash',
                  updatedAt: new Date(),
                })
                .where(eq(emails.id, message.id));
              
              console.log(`✅ Updated database: ${message.id} → isTrashed=true, folder=trash`);
              
              // CRITICAL: Also move to trash in Nylas
              try {
                await nylas.messages.update({
                  identifier: grantId,
                  messageId: message.providerMessageId,
                  requestBody: {
                    folders: ['trash'],
                  },
                });
                console.log(`✅ Moved email ${message.id} to trash in Nylas`);
              } catch (nylasError: any) {
                console.error('❌ Nylas trash error:', nylasError.message);
                // If Nylas fails, try to permanently delete instead
                try {
                  await nylas.messages.destroy({
                    identifier: grantId,
                    messageId: message.providerMessageId,
                  });
                  console.log(`✅ Permanently deleted email ${message.id} from Nylas`);
                } catch (deleteError: any) {
                  console.error('❌ Nylas delete also failed:', deleteError.message);
                  // Don't throw - database is already updated
                  console.log(`⚠️  Database marked as trashed, but Nylas sync failed`);
                }
              }
              break;

            case 'archive':
              // Archive message
              await db.update(emails)
                .set({
                  isArchived: true,
                  updatedAt: new Date(),
                })
                .where(eq(emails.id, message.id));
              
              // Also update in Nylas
              try {
                await nylas.messages.update({
                  identifier: grantId,
                  messageId: message.providerMessageId,
                  requestBody: {
                    folders: ['archive'],
                  },
                });
              } catch (nylasError) {
                console.error('Nylas archive error:', nylasError);
                // Continue even if Nylas fails
              }
              break;

            case 'markRead':
              // Mark as read
              await db.update(emails)
                .set({
                  isRead: true,
                  updatedAt: new Date(),
                })
                .where(eq(emails.id, message.id));

              // Update in Nylas
              try {
                await nylas.messages.update({
                  identifier: grantId,
                  messageId: message.providerMessageId,
                  requestBody: {
                    unread: false,
                  },
                });
              } catch (nylasError) {
                console.error('Nylas markRead error:', nylasError);
              }
              break;

            case 'markUnread':
              // Mark as unread
              await db.update(emails)
                .set({
                  isRead: false,
                  updatedAt: new Date(),
                })
                .where(eq(emails.id, message.id));

              // Update in Nylas
              try {
                await nylas.messages.update({
                  identifier: grantId,
                  messageId: message.providerMessageId,
                  requestBody: {
                    unread: true,
                  },
                });
              } catch (nylasError) {
                console.error('Nylas markUnread error:', nylasError);
              }
              break;

            case 'move':
              // Move to different folder
              if (value) {
                await db.update(emails)
                  .set({
                    folder: value,
                    updatedAt: new Date(),
                  })
                  .where(eq(emails.id, message.id));

                // Update in Nylas
                try {
                  await nylas.messages.update({
                    identifier: grantId,
                    messageId: message.providerMessageId,
                    requestBody: {
                      folders: [value],
                    },
                  });
                } catch (nylasError) {
                  console.error('Nylas move error:', nylasError);
                }
              }
              break;

            default:
              return NextResponse.json(
                { error: `Unknown action: ${action}` },
                { status: 400 }
              );
          }

          successCount++;
        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error);
          errorCount++;
        }
      }
    }

    console.log(`✅ Bulk action complete: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      processed: successCount,
      errors: errorCount,
      message: `${successCount} emails ${action === 'delete' ? 'deleted' : action === 'archive' ? 'archived' : action === 'markRead' ? 'marked as read' : action === 'markUnread' ? 'marked as unread' : 'moved'}`,
    });
  } catch (error: any) {
    console.error('❌ Bulk action error:', error);
    return NextResponse.json(
      {
        error: 'Bulk action failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

