/**
 * Debug API endpoint to check account scopes
 * This helps diagnose calendar sync issues related to missing or incorrect scopes
 *
 * Usage: GET /api/debug/account-scopes?accountId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');

    if (!accountId) {
      // Return all accounts with scope information
      const accounts = await db.query.emailAccounts.findMany({
        columns: {
          id: true,
          emailAddress: true,
          emailProvider: true,
          nylasProvider: true,
          nylasScopes: true,
          nylasGrantId: true,
          syncStatus: true,
          lastCalendarSyncAt: true,
        },
      });

      const diagnostics = accounts.map(account => ({
        id: account.id,
        email: account.emailAddress,
        provider: account.nylasProvider || account.emailProvider,
        grantId: account.nylasGrantId,
        scopes: {
          raw: account.nylasScopes,
          isArray: Array.isArray(account.nylasScopes),
          count: Array.isArray(account.nylasScopes) ? account.nylasScopes.length : 0,
          hasCalendar: Array.isArray(account.nylasScopes)
            ? account.nylasScopes.some(s => s.toLowerCase().includes('calendar'))
            : false,
          calendarScopes: Array.isArray(account.nylasScopes)
            ? account.nylasScopes.filter(s => s.toLowerCase().includes('calendar'))
            : [],
        },
        sync: {
          status: account.syncStatus,
          lastCalendarSync: account.lastCalendarSyncAt,
        },
      }));

      return NextResponse.json({
        success: true,
        totalAccounts: accounts.length,
        accounts: diagnostics,
      });
    }

    // Get specific account
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    // Detailed diagnostics for single account
    const scopes = account.nylasScopes;
    const isValidScopeArray = Array.isArray(scopes);
    const scopeCount = isValidScopeArray ? scopes.length : 0;
    const hasCalendar = isValidScopeArray
      ? scopes.some(s => s.toLowerCase().includes('calendar'))
      : false;

    const diagnostic = {
      account: {
        id: account.id,
        email: account.emailAddress,
        provider: account.nylasProvider || account.emailProvider,
        grantId: account.nylasGrantId,
      },
      scopes: {
        raw: scopes,
        type: typeof scopes,
        isArray: isValidScopeArray,
        count: scopeCount,
        isEmpty: scopeCount === 0,
        allScopes: isValidScopeArray ? scopes : [],
      },
      calendar: {
        hasCalendarScopes: hasCalendar,
        calendarScopes: isValidScopeArray
          ? scopes.filter(s => s.toLowerCase().includes('calendar'))
          : [],
        canSync: hasCalendar && !!account.nylasGrantId,
      },
      sync: {
        status: account.syncStatus,
        lastSync: account.lastSyncedAt,
        lastCalendarSync: account.lastCalendarSyncAt,
        lastError: account.lastError,
      },
      issues: [],
    };

    // Identify issues
    const issues: string[] = [];

    if (!account.nylasGrantId) {
      issues.push('Missing Nylas grant ID - account may not be properly connected');
    }

    if (!isValidScopeArray) {
      issues.push(`Scopes are not an array (type: ${typeof scopes}) - OAuth callback may have failed`);
    } else if (scopeCount === 0) {
      issues.push('Scopes array is empty - user may have denied permissions during OAuth');
    } else if (!hasCalendar) {
      issues.push('No calendar scopes found - calendar sync will fail');
    }

    diagnostic.issues = issues;

    return NextResponse.json({
      success: true,
      diagnostic,
      recommendation: issues.length > 0
        ? 'Account needs to be reconnected with proper calendar permissions'
        : 'Account appears properly configured for calendar sync',
    });

  } catch (error) {
    console.error('❌ Diagnostic endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Diagnostic check failed',
      },
      { status: 500 }
    );
  }
}
