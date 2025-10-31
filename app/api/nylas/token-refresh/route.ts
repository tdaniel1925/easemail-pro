import { NextRequest, NextResponse } from 'next/server';
import { checkAndRefreshTokens, refreshAccountTokenManually } from '@/lib/email/token-refresh';

// POST: Manually trigger token refresh for all accounts or specific account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId } = body;

    if (accountId) {
      // Refresh specific account
      const success = await refreshAccountTokenManually(accountId);
      
      return NextResponse.json({ 
        success, 
        message: success ? 'Token refreshed successfully' : 'Token refresh failed'
      });
    } else {
      // Refresh all accounts
      const results = await checkAndRefreshTokens();
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return NextResponse.json({ 
        success: true,
        refreshed: successCount,
        failed: failCount,
        results 
      });
    }
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// GET: Check token status for all accounts
export async function GET(request: NextRequest) {
  try {
    const results = await checkAndRefreshTokens();
    
    return NextResponse.json({ 
      success: true,
      results 
    });
  } catch (error: any) {
    console.error('Token check error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

