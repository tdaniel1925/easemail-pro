/**
 * Recurring Events Service
 * Handles RRULE parsing, instance generation, and recurring event management
 */

import { RRule, RRuleSet, rrulestr } from 'rrule';
import { db } from '@/lib/db/drizzle';
import { calendarEvents } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface RecurrenceOptions {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: Date;
  byWeekday?: number[]; // 0=Monday, 6=Sunday
  byMonthDay?: number[];
  byMonth?: number[];
}

/**
 * Convert user-friendly options to RRULE string
 */
export function buildRRuleString(options: RecurrenceOptions, startDate: Date): string {
  const rule = new RRule({
    freq: RRule[options.frequency],
    interval: options.interval || 1,
    count: options.count,
    until: options.until,
    byweekday: options.byWeekday,
    bymonthday: options.byMonthDay,
    bymonth: options.byMonth,
    dtstart: startDate,
  });
  
  return rule.toString();
}

/**
 * Parse RRULE string into user-friendly options
 */
export function parseRRuleString(rruleStr: string): RecurrenceOptions | null {
  try {
    const rule = rrulestr(rruleStr) as RRule;
    const options = rule.origOptions;
    
    const freqMap: Record<number, RecurrenceOptions['frequency']> = {
      [RRule.DAILY]: 'DAILY',
      [RRule.WEEKLY]: 'WEEKLY',
      [RRule.MONTHLY]: 'MONTHLY',
      [RRule.YEARLY]: 'YEARLY',
    };
    
    return {
      frequency: freqMap[options.freq],
      interval: options.interval,
      count: options.count,
      until: options.until,
      byWeekday: options.byweekday,
      byMonthDay: options.bymonthday,
      byMonth: options.bymonth,
    };
  } catch (error) {
    console.error('Failed to parse RRULE:', error);
    return null;
  }
}

/**
 * Generate occurrences for a recurring event within a date range
 */
export function generateOccurrences(
  rruleStr: string,
  startDate: Date,
  rangeStart: Date,
  rangeEnd: Date,
  maxOccurrences: number = 500
): Date[] {
  try {
    const rule = rrulestr(rruleStr) as RRule;
    
    // Get occurrences within the date range
    const occurrences = rule.between(rangeStart, rangeEnd, true);
    
    // Limit to prevent performance issues
    return occurrences.slice(0, maxOccurrences);
  } catch (error) {
    console.error('Failed to generate occurrences:', error);
    return [];
  }
}

/**
 * Create recurring event instances for a date range
 */
export async function createRecurringInstances(
  parentEventId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<number> {
  try {
    // Get parent event
    const parentEvent = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, parentEventId)
    });
    
    if (!parentEvent || !parentEvent.isRecurring || !parentEvent.recurrenceRule) {
      return 0;
    }
    
    // Generate occurrences
    const occurrences = generateOccurrences(
      parentEvent.recurrenceRule,
      parentEvent.startTime,
      rangeStart,
      rangeEnd
    );
    
    // Check which instances already exist
    const existingInstances = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.parentEventId, parentEventId),
          gte(calendarEvents.startTime, rangeStart),
          lte(calendarEvents.startTime, rangeEnd)
        )
      );
    
    const existingDates = new Set(
      existingInstances.map(e => e.startTime.toISOString())
    );
    
    // Calculate event duration
    const duration = parentEvent.endTime.getTime() - parentEvent.startTime.getTime();
    
    // Create new instances
    let created = 0;
    for (const occurrenceDate of occurrences) {
      const startTime = new Date(occurrenceDate);
      const endTime = new Date(startTime.getTime() + duration);
      
      // Skip if instance already exists
      if (existingDates.has(startTime.toISOString())) {
        continue;
      }
      
      // Create instance
      await db.insert(calendarEvents).values({
        userId: parentEvent.userId,
        parentEventId: parentEvent.id,
        title: parentEvent.title,
        description: parentEvent.description,
        location: parentEvent.location,
        startTime,
        endTime,
        allDay: parentEvent.allDay,
        timezone: parentEvent.timezone,
        isRecurring: false, // Instances are not recurring themselves
        recurrenceRule: null,
        calendarType: parentEvent.calendarType,
        color: parentEvent.color,
        category: parentEvent.category,
        organizerEmail: parentEvent.organizerEmail,
        attendees: parentEvent.attendees,
        reminders: parentEvent.reminders,
        isPrivate: parentEvent.isPrivate,
        status: parentEvent.status,
        metadata: {
          ...parentEvent.metadata,
          isInstance: true,
          parentId: parentEvent.id,
          originalStart: startTime.toISOString(),
        } as any,
      });
      
      created++;
    }
    
    console.log(`✅ Created ${created} recurring instances for event ${parentEventId}`);
    return created;
    
  } catch (error) {
    console.error('Failed to create recurring instances:', error);
    throw error;
  }
}

/**
 * Update all future instances of a recurring event
 */
export async function updateFutureInstances(
  parentEventId: string,
  updates: Partial<typeof calendarEvents.$inferInsert>,
  fromDate: Date = new Date()
): Promise<number> {
  try {
    const result = await db
      .update(calendarEvents)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(calendarEvents.parentEventId, parentEventId),
          gte(calendarEvents.startTime, fromDate)
        )
      );
    
    return result.rowCount || 0;
  } catch (error) {
    console.error('Failed to update future instances:', error);
    throw error;
  }
}

/**
 * Delete all future instances of a recurring event
 */
export async function deleteFutureInstances(
  parentEventId: string,
  fromDate: Date = new Date()
): Promise<number> {
  try {
    const result = await db
      .delete(calendarEvents)
      .where(
        and(
          eq(calendarEvents.parentEventId, parentEventId),
          gte(calendarEvents.startTime, fromDate)
        )
      );
    
    return result.rowCount || 0;
  } catch (error) {
    console.error('Failed to delete future instances:', error);
    throw error;
  }
}

/**
 * Convert recurring event to human-readable string
 */
export function rruleToText(rruleStr: string): string {
  try {
    const rule = rrulestr(rruleStr) as RRule;
    return rule.toText();
  } catch (error) {
    return 'Custom recurrence';
  }
}

/**
 * Common recurrence patterns
 */
export const RecurrencePresets = {
  DAILY: (startDate: Date) => buildRRuleString({ frequency: 'DAILY' }, startDate),
  WEEKLY: (startDate: Date) => buildRRuleString({ frequency: 'WEEKLY' }, startDate),
  MONTHLY: (startDate: Date) => buildRRuleString({ frequency: 'MONTHLY' }, startDate),
  YEARLY: (startDate: Date) => buildRRuleString({ frequency: 'YEARLY' }, startDate),
  
  WEEKDAYS: (startDate: Date) => buildRRuleString({
    frequency: 'WEEKLY',
    byWeekday: [0, 1, 2, 3, 4], // Mon-Fri
  }, startDate),
  
  EVERY_OTHER_WEEK: (startDate: Date) => buildRRuleString({
    frequency: 'WEEKLY',
    interval: 2,
  }, startDate),
  
  FIRST_DAY_OF_MONTH: (startDate: Date) => buildRRuleString({
    frequency: 'MONTHLY',
    byMonthDay: [1],
  }, startDate),
};

