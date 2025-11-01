/**
 * SMS Character Encoding and Segment Calculation
 * Handles GSM-7, Unicode (UCS-2), and emoji properly
 */

const GSM_7BIT_CHARS = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_7BIT_EXTENDED = "^{}\\[~]|€";

export interface SMSSegmentInfo {
  characterCount: number;
  messageCount: number;
  encoding: 'GSM-7' | 'UCS-2';
  charsPerSegment: number;
  charsRemaining: number;
  hasEmoji: boolean;
  warningMessage?: string;
}

/**
 * Check if text uses GSM-7 encoding
 */
function isGSM7(text: string): boolean {
  for (const char of text) {
    if (!GSM_7BIT_CHARS.includes(char) && !GSM_7BIT_EXTENDED.includes(char)) {
      return false;
    }
  }
  return true;
}

/**
 * Count characters accounting for GSM-7 extended chars (count as 2)
 */
function countGSM7Chars(text: string): number {
  let count = 0;
  for (const char of text) {
    if (GSM_7BIT_EXTENDED.includes(char)) {
      count += 2; // Extended chars count as 2
    } else {
      count += 1;
    }
  }
  return count;
}

/**
 * Detect emojis in text
 */
function hasEmoji(text: string): boolean {
  // Simplified emoji detection without unicode regex flag
  const emojiPattern = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\uD83C-\uD83F][\uDC00-\uDFFF]|[\u2000-\u3300]|\uD83E[\uDD00-\uDDFF]/g;
  return emojiPattern.test(text);
}

/**
 * Calculate SMS segment information
 * Properly handles GSM-7, UCS-2, emojis, and multi-part messages
 */
export function calculateSMSSegments(text: string): SMSSegmentInfo {
  if (!text) {
    return {
      characterCount: 0,
      messageCount: 0,
      encoding: 'GSM-7',
      charsPerSegment: 160,
      charsRemaining: 160,
      hasEmoji: false,
    };
  }

  const hasEmojis = hasEmoji(text);
  const useGSM7 = !hasEmojis && isGSM7(text);
  const encoding = useGSM7 ? 'GSM-7' : 'UCS-2';

  let characterCount: number;
  let charsPerSegment: number;
  let messageCount: number;

  if (useGSM7) {
    characterCount = countGSM7Chars(text);
    
    if (characterCount <= 160) {
      charsPerSegment = 160;
      messageCount = 1;
    } else {
      charsPerSegment = 153; // Multipart SMS uses 153 chars per segment
      messageCount = Math.ceil(characterCount / charsPerSegment);
    }
  } else {
    // UCS-2 (Unicode) encoding
    characterCount = text.length;
    
    if (characterCount <= 70) {
      charsPerSegment = 70;
      messageCount = 1;
    } else {
      charsPerSegment = 67; // Multipart Unicode SMS
      messageCount = Math.ceil(characterCount / charsPerSegment);
    }
  }

  const charsRemaining = (messageCount * charsPerSegment) - characterCount;

  const result: SMSSegmentInfo = {
    characterCount,
    messageCount,
    encoding,
    charsPerSegment,
    charsRemaining,
    hasEmoji: hasEmojis,
  };

  // Add warnings
  if (messageCount > 3) {
    result.warningMessage = `Long message: will be sent as ${messageCount} separate SMS`;
  }
  if (hasEmojis) {
    result.warningMessage = (result.warningMessage || '') + ' Contains emoji (uses more characters)';
  }

  return result;
}

/**
 * Estimate SMS cost based on segments
 */
export function estimateSMSCost(text: string, pricePerSegment: number = 0.05): number {
  const segments = calculateSMSSegments(text);
  return segments.messageCount * pricePerSegment;
}

/**
 * Validate message length
 */
export function validateSMSLength(text: string, maxSegments: number = 10): {
  valid: boolean;
  error?: string;
  segments: SMSSegmentInfo;
} {
  const segments = calculateSMSSegments(text);

  if (segments.messageCount > maxSegments) {
    return {
      valid: false,
      error: `Message too long. Maximum ${maxSegments} segments (${maxSegments * segments.charsPerSegment} characters) allowed.`,
      segments,
    };
  }

  return {
    valid: true,
    segments,
  };
}

/**
 * Get segment information for display
 */
export function getSMSDisplayInfo(text: string): string {
  if (!text) return '0 characters, 0 SMS';
  
  const segments = calculateSMSSegments(text);
  return `${segments.characterCount} characters, ${segments.messageCount} SMS (${segments.encoding})`;
}

