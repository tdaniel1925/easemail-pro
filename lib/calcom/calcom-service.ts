/**
 * Cal.com API Service
 * Handles all interactions with Cal.com API v2
 */

const CALCOM_API_BASE = 'https://api.cal.com/v2';
const CALCOM_API_VERSION = '2024-08-13';

export interface CalcomBooking {
  id: number;
  uid: string;
  title: string;
  description?: string;
  status: 'ACCEPTED' | 'CANCELLED' | 'PENDING' | 'REJECTED';
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  eventTypeId: number;
  eventType?: {
    id: number;
    title: string;
    slug: string;
  };
  organizer?: {
    id: number;
    name: string;
    email: string;
    username?: string;
    timezone: string;
    language: string;
  };
  attendees: Array<{
    name: string;
    email: string;
    timezone: string;
    locale?: string;
  }>;
  location?: string;
  meetingUrl?: string;
  customInputs?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  rescheduledFromUid?: string;
}

export interface CalcomBookingsResponse {
  status: 'success' | 'error';
  data?: CalcomBooking[];
  error?: string;
}

export interface CalcomFetchOptions {
  status?: string[]; // ['ACCEPTED', 'PENDING']
  attendeeEmail?: string;
  attendeeName?: string;
  eventTypeIds?: number[];
  teamIds?: number[];
  afterStart?: string; // ISO 8601 date
  beforeEnd?: string; // ISO 8601 date
  limit?: number;
  offset?: number;
}

/**
 * Fetch bookings from Cal.com API
 */
export async function fetchCalcomBookings(
  apiKey: string,
  options: CalcomFetchOptions = {}
): Promise<CalcomBookingsResponse> {
  try {
    // Build query parameters
    const params = new URLSearchParams();

    if (options.status && options.status.length > 0) {
      params.append('status', options.status.join(','));
    }
    if (options.attendeeEmail) {
      params.append('attendeeEmail', options.attendeeEmail);
    }
    if (options.attendeeName) {
      params.append('attendeeName', options.attendeeName);
    }
    if (options.eventTypeIds && options.eventTypeIds.length > 0) {
      params.append('eventTypeIds', options.eventTypeIds.join(','));
    }
    if (options.teamIds && options.teamIds.length > 0) {
      params.append('teamIds', options.teamIds.join(','));
    }
    if (options.afterStart) {
      params.append('afterStart', options.afterStart);
    }
    if (options.beforeEnd) {
      params.append('beforeEnd', options.beforeEnd);
    }
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }
    if (options.offset) {
      params.append('offset', options.offset.toString());
    }

    const url = `${CALCOM_API_BASE}/bookings${params.toString() ? `?${params.toString()}` : ''}`;

    console.log('[CalcomService] Fetching bookings:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'cal-api-version': CALCOM_API_VERSION,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CalcomService] API Error:', response.status, errorText);

      return {
        status: 'error',
        error: `Cal.com API error: ${response.status} - ${errorText.substring(0, 200)}`,
      };
    }

    const data = await response.json();

    console.log('[CalcomService] Fetched', data.data?.length || 0, 'bookings');

    return {
      status: 'success',
      data: data.data || [],
    };

  } catch (error: any) {
    console.error('[CalcomService] Fetch error:', error);
    return {
      status: 'error',
      error: error.message || 'Failed to fetch Cal.com bookings',
    };
  }
}

/**
 * Fetch a single booking by UID
 */
export async function fetchCalcomBooking(
  apiKey: string,
  bookingUid: string
): Promise<{ status: 'success' | 'error'; data?: CalcomBooking; error?: string }> {
  try {
    const url = `${CALCOM_API_BASE}/bookings/${bookingUid}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'cal-api-version': CALCOM_API_VERSION,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        status: 'error',
        error: `Cal.com API error: ${response.status} - ${errorText.substring(0, 200)}`,
      };
    }

    const data = await response.json();

    return {
      status: 'success',
      data: data.data,
    };

  } catch (error: any) {
    console.error('[CalcomService] Fetch booking error:', error);
    return {
      status: 'error',
      error: error.message || 'Failed to fetch Cal.com booking',
    };
  }
}

/**
 * Verify webhook signature
 * Cal.com sends X-Cal-Signature-256 header with HMAC SHA256 signature
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Create HMAC SHA256 hash of payload using secret
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageData
    );

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Compare with received signature
    return hashHex === signature;

  } catch (error) {
    console.error('[CalcomService] Signature verification error:', error);
    return false;
  }
}

/**
 * Parse Cal.com webhook event
 */
export interface CalcomWebhookEvent {
  triggerEvent:
    | 'BOOKING_CREATED'
    | 'BOOKING_RESCHEDULED'
    | 'BOOKING_CANCELLED'
    | 'BOOKING_REJECTED'
    | 'BOOKING_REQUESTED'
    | 'BOOKING_PAID'
    | 'BOOKING_PAYMENT_INITIATED'
    | 'BOOKING_NO_SHOW_UPDATED'
    | 'MEETING_STARTED'
    | 'MEETING_ENDED'
    | 'RECORDING_READY'
    | 'RECORDING_TRANSCRIPTION_GENERATED'
    | 'INSTANT_MEETING'
    | 'OUT_OF_OFFICE_CREATED'
    | 'FORM_SUBMITTED';
  payload: {
    uid?: string;
    id?: number;
    title?: string;
    type?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    organizer?: {
      id: number;
      name: string;
      email: string;
      username: string;
      timezone: string;
      language: string;
    };
    attendees?: Array<{
      name: string;
      email: string;
      timezone: string;
    }>;
    location?: string;
    meetingUrl?: string;
    status?: string;
    responses?: Record<string, any>;
    metadata?: Record<string, any>;
  };
}

export function parseWebhookEvent(body: any): CalcomWebhookEvent | null {
  try {
    if (!body || !body.triggerEvent || !body.payload) {
      console.error('[CalcomService] Invalid webhook body structure');
      return null;
    }

    return body as CalcomWebhookEvent;

  } catch (error) {
    console.error('[CalcomService] Parse webhook error:', error);
    return null;
  }
}
