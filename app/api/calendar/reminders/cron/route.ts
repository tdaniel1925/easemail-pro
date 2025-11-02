/**
 * Reminder Cron API
 * Triggers reminder processing
 * Should be called every 5 minutes by a cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { processReminders } from '@/lib/calendar/reminder-service';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-here';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Process reminders
    const result = await processReminders();
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('❌ Reminder cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process reminders', details: error.message },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}

