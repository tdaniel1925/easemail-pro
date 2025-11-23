/**
 * RSVP Token Generation and Validation
 * Creates secure tokens for calendar invitation RSVP links
 */

import crypto from 'crypto';

interface RSVPTokenData {
  eventId: string;
  attendeeEmail: string;
  response: 'accepted' | 'declined' | 'tentative';
}

// Lazy getter for secret key - throws only when accessed
function getSecretKey(): string {
  const key = process.env.RSVP_SECRET_KEY;
  if (!key) {
    throw new Error(
      'RSVP_SECRET_KEY environment variable is required for secure RSVP token generation. ' +
      'Please set it in your .env.local file with a strong random key.'
    );
  }
  return key;
}

/**
 * Generate a secure RSVP token
 */
export function generateRSVPToken(eventId: string, attendeeEmail: string): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const data = `${eventId}:${attendeeEmail}:${timestamp}:${randomBytes}`;

  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', getSecretKey());
  hmac.update(data);
  const signature = hmac.digest('hex');
  
  // Combine data and signature, then base64 encode
  const token = Buffer.from(`${data}:${signature}`).toString('base64url');
  
  return token;
}

/**
 * Validate and decode RSVP token
 */
export function validateRSVPToken(token: string): { eventId: string; attendeeEmail: string; valid: boolean } | null {
  try {
    // Decode base64url
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    
    if (parts.length !== 5) {
      return null;
    }
    
    const [eventId, attendeeEmail, timestamp, randomBytes, signature] = parts;
    
    // Verify signature
    const data = `${eventId}:${attendeeEmail}:${timestamp}:${randomBytes}`;
    const hmac = crypto.createHmac('sha256', getSecretKey());
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Check if token is expired (valid for 1 year)
    const tokenTimestamp = parseInt(timestamp, 10);
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (Date.now() - tokenTimestamp > oneYear) {
      return null;
    }
    
    return {
      eventId,
      attendeeEmail,
      valid: true,
    };
  } catch (error) {
    console.error('Error validating RSVP token:', error);
    return null;
  }
}

/**
 * Generate RSVP links for an attendee
 */
export function generateRSVPLinks(eventId: string, attendeeEmail: string, baseUrl: string): {
  accept: string;
  decline: string;
  tentative: string;
} {
  const token = generateRSVPToken(eventId, attendeeEmail);
  
  return {
    accept: `${baseUrl}/api/calendar/events/${eventId}/rsvp?token=${token}&email=${encodeURIComponent(attendeeEmail)}&response=accepted`,
    decline: `${baseUrl}/api/calendar/events/${eventId}/rsvp?token=${token}&email=${encodeURIComponent(attendeeEmail)}&response=declined`,
    tentative: `${baseUrl}/api/calendar/events/${eventId}/rsvp?token=${token}&email=${encodeURIComponent(attendeeEmail)}&response=tentative`,
  };
}

