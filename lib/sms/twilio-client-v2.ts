/**
 * Twilio SMS Client with Database Config Support
 * Now reads configuration from admin panel (database) first, then falls back to .env
 */

import twilio from 'twilio';
import { getConfig } from '@/lib/config';

// Cache for Twilio client to avoid recreating on every call
let cachedClient: ReturnType<typeof twilio> | null = null;
let cachedConfig: {
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
} = {};

/**
 * Initialize Twilio client with config from database or env
 */
async function getTwilioClient() {
  // Get config (prioritizes database over env)
  const [accountSid, authToken, phoneNumber] = await Promise.all([
    getConfig('TWILIO_ACCOUNT_SID'),
    getConfig('TWILIO_AUTH_TOKEN'),
    getConfig('TWILIO_PHONE_NUMBER'),
  ]);

  // If config changed, recreate client
  if (
    !cachedClient ||
    cachedConfig.accountSid !== accountSid ||
    cachedConfig.authToken !== authToken
  ) {
    cachedConfig = { accountSid, authToken, phoneNumber };
    
    if (accountSid && authToken) {
      cachedClient = twilio(accountSid, authToken);
    } else {
      cachedClient = null;
    }
  }

  return {
    client: cachedClient,
    phoneNumber: phoneNumber || cachedConfig.phoneNumber,
    accountSid,
    authToken,
  };
}

export interface SendSMSParams {
  to: string;
  message: string;
  from?: string;
}

export interface SendSMSResponse {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
  cost?: number;
}

/**
 * Check if Twilio is properly configured
 */
export async function isTwilioConfigured(): Promise<boolean> {
  const { client, phoneNumber } = await getTwilioClient();
  const testMode = await getConfig('SMS_TEST_MODE');
  return !!(client && phoneNumber) || testMode === 'true';
}

/**
 * Get configuration error message
 */
export async function getTwilioConfigError(): Promise<string | null> {
  const testMode = await getConfig('SMS_TEST_MODE');
  if (testMode === 'true') return null;

  const { accountSid, authToken, phoneNumber } = await getTwilioClient();
  
  if (!accountSid) return 'TWILIO_ACCOUNT_SID not configured in admin panel or environment';
  if (!authToken) return 'TWILIO_AUTH_TOKEN not configured in admin panel or environment';
  if (!phoneNumber) return 'TWILIO_PHONE_NUMBER not configured in admin panel or environment';
  return null;
}

/**
 * Check if test mode is enabled
 */
export async function isTestModeEnabled(): Promise<boolean> {
  const testMode = await getConfig('SMS_TEST_MODE');
  return testMode === 'true';
}

/**
 * Check if phone number is a test number
 */
export async function isTestNumber(phone: string): Promise<boolean> {
  const testNumbers = await getConfig('SMS_TEST_NUMBERS');
  const TEST_NUMBERS = (testNumbers || '+15005550001,+15005550006').split(',');
  return TEST_NUMBERS.includes(phone);
}

/**
 * Send SMS in test mode (simulation)
 */
async function sendTestSMS(params: SendSMSParams): Promise<SendSMSResponse> {
  console.log('🧪 TEST MODE: Simulating SMS send');
  console.log('To:', params.to);
  console.log('Message:', params.message);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate different outcomes based on test number
  if (params.to === '+15005550001') {
    return {
      success: true,
      sid: `TEST_${Date.now()}`,
      status: 'delivered',
      cost: 0.0075,
    };
  } else if (params.to === '+15005550002') {
    return {
      success: false,
      error: 'Invalid phone number',
    };
  } else if (params.to === '+15005550009') {
    return {
      success: false,
      error: 'Phone number does not exist',
    };
  }

  return {
    success: true,
    sid: `TEST_${Date.now()}`,
    status: 'queued',
    cost: 0.0075,
  };
}

/**
 * Send SMS via Twilio (with database config support)
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResponse> {
  try {
    // Test mode check
    const testMode = await isTestModeEnabled();
    const isTest = await isTestNumber(params.to);
    
    if (testMode || isTest) {
      return sendTestSMS(params);
    }

    const { client, phoneNumber } = await getTwilioClient();

    if (!client) {
      throw new Error('Twilio not configured. Please configure API keys in Admin > API Keys.');
    }

    // Format phone number (ensure + prefix)
    const toPhone = params.to.startsWith('+') ? params.to : `+1${params.to}`;
    const fromPhone = params.from || phoneNumber;

    if (!fromPhone) {
      throw new Error('From phone number not configured');
    }

    console.log('📱 Sending SMS via Twilio:', { to: toPhone, from: fromPhone });

    const message = await client.messages.create({
      body: params.message,
      to: toPhone,
      from: fromPhone,
    });

    console.log('✅ SMS sent:', message.sid);

    return {
      success: true,
      sid: message.sid,
      status: message.status,
      cost: message.price ? Math.abs(parseFloat(message.price)) : 0.0075,
    };
  } catch (error: any) {
    console.error('❌ SMS send error:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    };
  }
}

/**
 * Get SMS status from Twilio
 */
export async function getSMSStatus(sid: string): Promise<{
  status?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  dateSent?: Date | null;
  price?: string | null;
} | null> {
  try {
    const { client } = await getTwilioClient();

    if (!client) {
      console.warn('Twilio client not configured');
      return null;
    }

    if (sid.startsWith('TEST_')) {
      return {
        status: 'delivered',
        errorCode: null,
        errorMessage: null,
        dateSent: new Date(),
        price: '0.0075',
      };
    }

    const message = await client.messages(sid).fetch();
    
    return {
      status: message.status,
      errorCode: message.errorCode ? String(message.errorCode) : null,
      errorMessage: message.errorMessage,
      dateSent: message.dateSent,
      price: message.price,
    };
  } catch (error: any) {
    console.error('❌ SMS status fetch error:', error);
    return null;
  }
}

/**
 * Send SMS with test mode automatically handled
 */
export async function sendSMSWithTestMode(params: SendSMSParams): Promise<SendSMSResponse> {
  return sendSMS(params);
}

