/**
 * Twilio SMS Client with Test Mode Support
 * Handles SMS sending, status checking, and test mode
 */

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const isTestMode = process.env.SMS_TEST_MODE === 'true';

// Test numbers for simulation
const TEST_NUMBERS = (process.env.SMS_TEST_NUMBERS || '+15005550001,+15005550006').split(',');

if (!isTestMode && (!accountSid || !authToken || !twilioPhoneNumber)) {
  console.warn('⚠️ Twilio credentials not configured. SMS will not work.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

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
export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && twilioPhoneNumber) || isTestMode;
}

/**
 * Get configuration error message
 */
export function getTwilioConfigError(): string | null {
  if (isTestMode) return null;
  if (!accountSid) return 'TWILIO_ACCOUNT_SID not configured';
  if (!authToken) return 'TWILIO_AUTH_TOKEN not configured';
  if (!twilioPhoneNumber) return 'TWILIO_PHONE_NUMBER not configured';
  return null;
}

/**
 * Check if test mode is enabled
 */
export function isTestModeEnabled(): boolean {
  return isTestMode;
}

/**
 * Check if phone number is a test number
 */
export function isTestNumber(phone: string): boolean {
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
    // Success
    return {
      success: true,
      sid: `TEST_${Date.now()}`,
      status: 'delivered',
      cost: 0.0075,
    };
  } else if (params.to === '+15005550002') {
    // Invalid number
    return {
      success: false,
      error: 'Invalid phone number',
    };
  } else if (params.to === '+15005550009') {
    // Missing number
    return {
      success: false,
      error: 'Phone number does not exist',
    };
  }

  // Default success
  return {
    success: true,
    sid: `TEST_${Date.now()}`,
    status: 'queued',
    cost: 0.0075,
  };
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResponse> {
  try {
    // Test mode check
    if (isTestMode || isTestNumber(params.to)) {
      return sendTestSMS(params);
    }

    if (!client) {
      throw new Error('Twilio not configured');
    }

    // Format phone number (ensure + prefix)
    const toPhone = params.to.startsWith('+') ? params.to : `+1${params.to}`;
    const fromPhone = params.from || twilioPhoneNumber;

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
    if (!client) {
      console.warn('Twilio client not configured');
      return null;
    }

    if (sid.startsWith('TEST_')) {
      // Test mode
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

