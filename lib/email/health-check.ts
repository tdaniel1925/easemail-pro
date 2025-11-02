/**
 * Nylas Health Check Utility
 * 
 * Proactively check connection health before attempting sync
 * to prevent errors and improve user experience
 */

import Nylas from 'nylas';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY || 'dummy-key-for-build',
  apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
});

/**
 * Check if a specific grant/account is healthy
 * NOTE: This is now very lightweight - just checks if grant exists
 */
export async function checkNylasAccountHealth(grantId: string): Promise<{
  healthy: boolean;
  error?: string;
}> {
  try {
    // Quick lightweight check - just validate grant exists
    const grant = await nylas.grants.find({ grantId });
    
    if (!grant.data) {
      return { healthy: false, error: 'Grant not found' };
    }

    // Check grant status
    if (grant.data.grantStatus !== 'valid') {
      return { 
        healthy: false, 
        error: `Grant status: ${grant.data.grantStatus}` 
      };
    }

    return { healthy: true };
  } catch (error: any) {
    console.error('Account health check failed:', error);
    
    // Detect error type
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return { healthy: false, error: 'Authentication required' };
    }
    
    if (error.message?.includes('404')) {
      return { healthy: false, error: 'Account not found' };
    }

    return { healthy: false, error: error.message || 'Unknown error' };
  }
}

/**
 * SIMPLIFIED: Comprehensive health check
 * 
 * We removed the service-level check because:
 * 1. It was too aggressive (5-second timeout)
 * 2. It checked the base URL instead of the specific grant
 * 3. It caused false "unreachable" errors during dev restarts
 * 
 * Now we only check the specific grant, which is more reliable.
 */
export async function checkConnectionHealth(grantId: string): Promise<{
  canSync: boolean;
  reason?: string;
  suggestion?: string;
}> {
  // Check specific account
  const accountHealth = await checkNylasAccountHealth(grantId);
  
  if (!accountHealth.healthy) {
    const requiresReconnect = 
      accountHealth.error?.includes('Authentication') ||
      accountHealth.error?.includes('not found');

    return {
      canSync: false,
      reason: accountHealth.error || 'Account health check failed',
      suggestion: requiresReconnect 
        ? 'Please reconnect your account'
        : 'Try again in a moment',
    };
  }

  return { canSync: true };
}

