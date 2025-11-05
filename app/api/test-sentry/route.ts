import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Log to verify endpoint is called
    console.log('🧪 Sentry test endpoint called');
    
    // Capture a test message
    Sentry.captureMessage('Test message from API route', 'info');
    
    // Capture a test error
    const testError = new Error('Test error from Sentry test endpoint!');
    Sentry.captureException(testError);
    
    console.log('✅ Sent test error to Sentry');
    
    return NextResponse.json({
      success: true,
      message: 'Test error sent to Sentry. Check your dashboard in 10 seconds.',
      dashboard: 'https://sentry.io/organizations/bioquest/projects/javascript-nextjs/issues/',
    });
  } catch (error) {
    console.error('❌ Error in test endpoint:', error);
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to send test' }, { status: 500 });
  }
}

