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
  dangerouslyAllowBrowser: true,
});

/**
 * Check if a specific grant/account is healthy
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
 * Check if Nylas API service is reachable
 */
export async function checkNylasServiceHealth(): Promise<{
  healthy: boolean;
  responseTime?: number;
}> {
  const startTime = Date.now();
  
  try {
    // Simple HEAD request to check if API is reachable
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(process.env.NYLAS_API_URI || 'https://api.us.nylas.com', {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    return {
      healthy: response.ok,
      responseTime,
    };
  } catch (error) {
    console.error('Service health check failed:', error);
    return { healthy: false };
  }
}

/**
 * Comprehensive health check with retry
 */
export async function checkConnectionHealth(grantId: string): Promise<{
  canSync: boolean;
  reason?: string;
  suggestion?: string;
}> {
  // First check if service is reachable
  const serviceHealth = await checkNylasServiceHealth();
  
  if (!serviceHealth.healthy) {
    return {
      canSync: false,
      reason: 'Nylas service is unreachable',
      suggestion: 'Check your internet connection and try again in a moment',
    };
  }

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

