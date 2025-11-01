import OpenAI from 'openai';
import { db } from '@/lib/db/drizzle';
import { emails } from '@/lib/db/schema';
import { emailThreads, threadParticipants, threadTimelineEvents } from '@/lib/db/schema-threads';
import { eq, and, or, sql, desc, inArray } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
});

interface EmailForThreading {
  id: string;
  messageId: string | null;
  threadId: string | null;
  providerThreadId: string | null;
  inReplyTo: string | null;
  emailReferences: string | null;
  subject: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: Array<{ email: string; name?: string }> | null;
  ccEmails: Array<{ email: string; name?: string }> | null;
  bodyText: string | null;
  bodyHtml: string | null;
  snippet: string | null;
  receivedAt: Date | null;
  sentAt: Date | null;
  accountId: string;
  hasAttachments: boolean | null;
  attachmentsCount: number | null;
}

interface ThreadDetectionResult {
  threadId: string | null;
  isNewThread: boolean;
  confidence: 'high' | 'medium' | 'low';
  method: 'headers' | 'ai' | 'subject' | 'participants';
}

export class ThreadingService {
  /**
   * Detect which thread an email belongs to
   * Uses multiple methods: RFC headers, AI analysis, subject matching, participant matching
   */
  static async detectThread(email: EmailForThreading, userId: string): Promise<ThreadDetectionResult> {
    // Method 1: Provider-supplied thread ID (highest confidence)
    if (email.providerThreadId) {
      const existingThread = await db.query.emailThreads.findFirst({
        where: and(
          eq(emailThreads.userId, userId),
          sql`${emailThreads.accountIds}::jsonb @> ${JSON.stringify([email.accountId])}`
        ),
      });

      if (existingThread) {
        return {
          threadId: existingThread.id,
          isNewThread: false,
          confidence: 'high',
          method: 'headers',
        };
      }
    }

    // Method 2: In-Reply-To and References headers (high confidence)
    if (email.inReplyTo || email.emailReferences) {
      const referencedMessageIds = [
        email.inReplyTo,
        ...(email.emailReferences?.split(/[\s,]+/).filter(Boolean) || []),
      ].filter(Boolean) as string[];

      if (referencedMessageIds.length > 0) {
        // Find emails with these message IDs
        const referencedEmails = await db.query.emails.findMany({
          where: inArray(emails.messageId, referencedMessageIds),
          limit: 1,
        });

        if (referencedEmails.length > 0 && referencedEmails[0].threadId) {
          return {
            threadId: referencedEmails[0].threadId,
            isNewThread: false,
            confidence: 'high',
            method: 'headers',
          };
        }
      }
    }

    // Method 3: Subject-based matching (medium confidence)
    const normalizedSubject = this.normalizeSubject(email.subject || '');
    if (normalizedSubject) {
      const matchingThread = await db.query.emailThreads.findFirst({
        where: and(
          eq(emailThreads.userId, userId),
          eq(emailThreads.subject, normalizedSubject)
        ),
        orderBy: [desc(emailThreads.lastActivityAt)],
      });

      if (matchingThread) {
        // Check if participants overlap
        const hasOverlap = await this.checkParticipantOverlap(matchingThread.id, email);
        if (hasOverlap) {
          return {
            threadId: matchingThread.id,
            isNewThread: false,
            confidence: 'medium',
            method: 'subject',
          };
        }
      }
    }

    // Method 4: AI-powered detection (for edge cases)
    // Only use if we have recent context and the email seems like a reply
    if (this.looksLikeReply(email)) {
      const aiThreadId = await this.detectThreadWithAI(email, userId);
      if (aiThreadId) {
        return {
          threadId: aiThreadId,
          isNewThread: false,
          confidence: 'low',
          method: 'ai',
        };
      }
    }

    // No thread found - this is a new thread
    return {
      threadId: null,
      isNewThread: true,
      confidence: 'high',
      method: 'headers',
    };
  }

  /**
   * Create a new thread
   */
  static async createThread(email: EmailForThreading, userId: string): Promise<string> {
    const normalizedSubject = this.normalizeSubject(email.subject || '');
    const participants = this.extractParticipants(email);

    const [newThread] = await db.insert(emailThreads).values({
      userId,
      subject: normalizedSubject,
      firstMessageId: email.messageId,
      emailCount: 1,
      participantCount: participants.length,
      attachmentCount: email.attachmentsCount || 0,
      hasUnread: true,
      firstEmailAt: email.receivedAt || email.sentAt || new Date(),
      lastEmailAt: email.receivedAt || email.sentAt || new Date(),
      lastActivityAt: new Date(),
      accountIds: [email.accountId],
    }).returning();

    // Add participants
    if (participants.length > 0) {
      await db.insert(threadParticipants).values(
        participants.map((p, index) => ({
          threadId: newThread.id,
          email: p.email,
          name: p.name || null,
          messageCount: 1,
          firstParticipatedAt: email.receivedAt || email.sentAt || new Date(),
          lastParticipatedAt: email.receivedAt || email.sentAt || new Date(),
          isInitiator: index === 0, // First participant is the initiator
          isRecipient: index > 0,
        }))
      );
    }

    // Create timeline event
    await this.addTimelineEvent(newThread.id, email, 'email_received');

    return newThread.id;
  }

  /**
   * Add email to existing thread
   */
  static async addToThread(threadId: string, email: EmailForThreading): Promise<void> {
    const thread = await db.query.emailThreads.findFirst({
      where: eq(emailThreads.id, threadId),
    });

    if (!thread) {
      throw new Error('Thread not found');
    }

    const participants = this.extractParticipants(email);
    const newAccountIds = thread.accountIds || [];
    if (!newAccountIds.includes(email.accountId)) {
      newAccountIds.push(email.accountId);
    }

    // Update thread
    await db.update(emailThreads)
      .set({
        emailCount: (thread.emailCount || 0) + 1,
        attachmentCount: (thread.attachmentCount || 0) + (email.attachmentsCount || 0),
        lastEmailAt: email.receivedAt || email.sentAt || new Date(),
        lastActivityAt: new Date(),
        accountIds: newAccountIds,
        hasUnread: true,
        updatedAt: new Date(),
      })
      .where(eq(emailThreads.id, threadId));

    // Update or add participants
    for (const participant of participants) {
      const existing = await db.query.threadParticipants.findFirst({
        where: and(
          eq(threadParticipants.threadId, threadId),
          eq(threadParticipants.email, participant.email)
        ),
      });

      if (existing) {
        await db.update(threadParticipants)
          .set({
            messageCount: (existing.messageCount || 0) + 1,
            lastParticipatedAt: email.receivedAt || email.sentAt || new Date(),
          })
          .where(eq(threadParticipants.id, existing.id));
      } else {
        await db.insert(threadParticipants).values({
          threadId,
          email: participant.email,
          name: participant.name || null,
          messageCount: 1,
          firstParticipatedAt: email.receivedAt || email.sentAt || new Date(),
          lastParticipatedAt: email.receivedAt || email.sentAt || new Date(),
          isInitiator: false,
          isRecipient: true,
        });

        // Increment participant count
        await db.update(emailThreads)
          .set({
            participantCount: (thread.participantCount || 0) + 1,
          })
          .where(eq(emailThreads.id, threadId));
      }
    }

    // Add timeline event
    await this.addTimelineEvent(threadId, email, 'email_received');
  }

  /**
   * Generate AI summary for a thread
   */
  static async generateThreadSummary(threadId: string): Promise<void> {
    const thread = await db.query.emailThreads.findFirst({
      where: eq(emailThreads.id, threadId),
    });

    if (!thread) {
      throw new Error('Thread not found');
    }

    // Get all emails in thread
    const threadEmails = await db.query.emails.findMany({
      where: eq(emails.threadId, threadId),
      orderBy: [desc(emails.receivedAt)],
      limit: 50, // Limit for performance
    });

    if (threadEmails.length === 0) {
      return;
    }

    // Prepare context for AI
    const emailsContext = threadEmails.map((e, index) => ({
      number: index + 1,
      from: e.fromEmail,
      date: e.receivedAt?.toISOString(),
      subject: e.subject,
      snippet: e.snippet || e.bodyText?.substring(0, 200),
    }));

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert email analyst. Analyze this email thread and provide:
1. A concise summary (2-3 sentences)
2. Key decisions made (if any)
3. Action items (if any)
4. Key topics discussed
5. Overall sentiment
6. Category (discussion, decision, info, action)
7. Priority level

Format your response as JSON.`,
          },
          {
            role: 'user',
            content: `Analyze this email thread:\n\n${JSON.stringify(emailsContext, null, 2)}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No AI response');
      }

      const analysis = JSON.parse(content);

      // Update thread with AI insights
      await db.update(emailThreads)
        .set({
          aiSummary: analysis.summary || null,
          aiSummaryGeneratedAt: new Date(),
          aiCategory: analysis.category || null,
          aiSentiment: analysis.sentiment || null,
          aiPriority: analysis.priority || null,
          decisions: analysis.decisions || [],
          actionItems: (analysis.actionItems || []).map((item: any) => ({
            ...item,
            status: 'pending',
          })),
          keyTopics: analysis.topics || [],
          needsReply: analysis.needsReply || false,
          predictedNextAction: analysis.predictedAction || null,
          updatedAt: new Date(),
        })
        .where(eq(emailThreads.id, threadId));
    } catch (error) {
      console.error('Error generating thread summary:', error);
      // Don't throw - gracefully handle AI failures
    }
  }

  /**
   * Get thread with full details
   */
  static async getThreadDetails(threadId: string) {
    const thread = await db.query.emailThreads.findFirst({
      where: eq(emailThreads.id, threadId),
      with: {
        participants: true,
        timelineEvents: {
          orderBy: [desc(threadTimelineEvents.occurredAt)],
          limit: 50,
        },
      },
    });

    if (!thread) {
      return null;
    }

    // Get all emails in thread
    const threadEmails = await db.query.emails.findMany({
      where: eq(emails.threadId, threadId),
      orderBy: [desc(emails.receivedAt)],
    });

    return {
      ...thread,
      emails: threadEmails,
    };
  }

  // Helper methods

  private static normalizeSubject(subject: string): string {
    return subject
      .replace(/^(Re:|RE:|Fwd:|FW:|Fw:)\s*/gi, '')
      .trim()
      .toLowerCase();
  }

  private static extractParticipants(email: EmailForThreading) {
    const participants: Array<{ email: string; name?: string }> = [];
    
    if (email.fromEmail) {
      participants.push({ email: email.fromEmail, name: email.fromName || undefined });
    }

    if (email.toEmails) {
      participants.push(...email.toEmails);
    }

    if (email.ccEmails) {
      participants.push(...email.ccEmails);
    }

    // Deduplicate by email
    const seen = new Set<string>();
    return participants.filter(p => {
      if (seen.has(p.email)) {
        return false;
      }
      seen.add(p.email);
      return true;
    });
  }

  private static async checkParticipantOverlap(threadId: string, email: EmailForThreading): Promise<boolean> {
    const threadParticipantsList = await db.query.threadParticipants.findMany({
      where: eq(threadParticipants.threadId, threadId),
    });

    const threadEmails = new Set(threadParticipantsList.map(p => p.email));
    const emailParticipants = this.extractParticipants(email);

    // Check if at least 50% of participants overlap
    const overlapCount = emailParticipants.filter(p => threadEmails.has(p.email)).length;
    return overlapCount >= Math.min(2, emailParticipants.length * 0.5);
  }

  private static looksLikeReply(email: EmailForThreading): boolean {
    const subject = email.subject || '';
    return /^(Re:|RE:|Fwd:|FW:|Fw:)/i.test(subject);
  }

  private static async detectThreadWithAI(email: EmailForThreading, userId: string): Promise<string | null> {
    // Get recent threads (last 7 days) with similar participants
    const participants = this.extractParticipants(email);
    const participantEmails = participants.map(p => p.email);

    if (participantEmails.length === 0) {
      return null;
    }

    const recentThreads = await db.query.emailThreads.findMany({
      where: and(
        eq(emailThreads.userId, userId),
        sql`${emailThreads.lastActivityAt} > NOW() - INTERVAL '7 days'`
      ),
      orderBy: [desc(emailThreads.lastActivityAt)],
      limit: 10,
      with: {
        participants: true,
      },
    });

    // Use simple heuristic for now (can be enhanced with AI)
    for (const thread of recentThreads) {
      const threadParticipantEmails = thread.participants.map(p => p.email);
      const overlap = participantEmails.filter(e => threadParticipantEmails.includes(e)).length;
      
      if (overlap >= 2) {
        return thread.id;
      }
    }

    return null;
  }

  private static async addTimelineEvent(
    threadId: string,
    email: EmailForThreading,
    eventType: string
  ): Promise<void> {
    await db.insert(threadTimelineEvents).values({
      threadId,
      emailId: email.id,
      eventType,
      actor: email.fromName || email.fromEmail || 'Unknown',
      actorEmail: email.fromEmail || null,
      summary: `${email.fromName || email.fromEmail} sent: ${email.subject}`,
      content: email.snippet || email.bodyText?.substring(0, 200) || null,
      metadata: {
        attachments: email.hasAttachments ? ['has attachments'] : undefined,
      },
      occurredAt: email.receivedAt || email.sentAt || new Date(),
    });
  }
}

