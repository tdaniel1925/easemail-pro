/**
 * Direct IMAP Connection Helper
 * Handles IMAP connections for providers like Fastmail that don't require OAuth
 */

import imaps from 'imap-simple';
import type { ImapSimple, ImapSimpleOptions, Message } from 'imap-simple';
import { simpleParser } from 'mailparser';

export interface IMAPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  tls?: boolean;
}

export interface IMAPConnectionOptions extends IMAPConfig {
  authTimeout?: number;
}

/**
 * Connect to IMAP server
 */
export async function connectToIMAP(config: IMAPConnectionOptions): Promise<ImapSimple> {
  const connectionConfig: ImapSimpleOptions = {
    imap: {
      user: config.username,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls ?? true,
      tlsOptions: {
        rejectUnauthorized: false // Allow self-signed certs (Fastmail uses valid certs though)
      },
      authTimeout: config.authTimeout || 10000,
    },
  };

  try {
    const connection = await imaps.connect(connectionConfig);
    console.log(`✅ IMAP connected to ${config.host}`);
    return connection;
  } catch (error) {
    console.error(`❌ IMAP connection failed:`, error);
    throw new Error(`Failed to connect to IMAP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Test IMAP connection
 */
export async function testIMAPConnection(config: IMAPConfig): Promise<{ success: boolean; error?: string }> {
  let connection: ImapSimple | null = null;

  try {
    connection = await connectToIMAP(config);

    // Try to list folders as a connectivity test
    const boxes = await connection.getBoxes();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

/**
 * Get list of IMAP folders/mailboxes
 */
export async function getIMAPFolders(connection: ImapSimple): Promise<string[]> {
  try {
    const boxes = await connection.getBoxes();

    // Recursively flatten folder structure
    const flattenBoxes = (boxes: any, prefix = ''): string[] => {
      const folders: string[] = [];

      for (const [name, box] of Object.entries(boxes)) {
        const boxData = box as any; // Type assertion for IMAP box
        const fullPath = prefix ? `${prefix}${boxData.delimiter}${name}` : name;

        // Add this folder
        folders.push(fullPath);

        // Add children if they exist
        if (boxData.children) {
          folders.push(...flattenBoxes(boxData.children, fullPath));
        }
      }

      return folders;
    };

    return flattenBoxes(boxes);
  } catch (error) {
    console.error('Failed to get IMAP folders:', error);
    throw error;
  }
}

/**
 * Fetch emails from a folder
 */
export async function fetchIMAPEmails(
  connection: ImapSimple,
  folder: string,
  options: {
    since?: Date;
    uid?: number; // Fetch emails with UID greater than this
    limit?: number;
  } = {}
): Promise<any[]> {
  try {
    await connection.openBox(folder);

    // Build search criteria
    const searchCriteria: any[] = ['ALL'];

    if (options.since) {
      searchCriteria.push(['SINCE', options.since]);
    }

    if (options.uid) {
      // Fetch emails with UID > last synced UID
      searchCriteria.push(['UID', `${options.uid + 1}:*`]);
    }

    // Fetch options - get headers and body
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''], // Full message
      markSeen: false,
      struct: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    console.log(`📥 Fetched ${messages.length} emails from ${folder}`);

    // Parse each message
    const parsedMessages = await Promise.all(
      messages.slice(0, options.limit || messages.length).map(async (message) => {
        try {
          // Find the full message part
          const all = message.parts.find((part: any) => part.which === '');
          if (!all) {
            console.warn('No message body found');
            return null;
          }

          // Parse the email
          const parsed = await simpleParser(all.body);

          return {
            uid: message.attributes.uid,
            flags: message.attributes.flags,
            date: message.attributes.date,
            parsed,
            raw: message,
          };
        } catch (parseError) {
          console.error('Failed to parse message:', parseError);
          return null;
        }
      })
    );

    return parsedMessages.filter((msg) => msg !== null);
  } catch (error) {
    console.error(`Failed to fetch emails from ${folder}:`, error);
    throw error;
  }
}

/**
 * Get the highest UID in a folder (for tracking last synced email)
 */
export async function getLastUID(connection: ImapSimple, folder: string): Promise<number> {
  try {
    await connection.openBox(folder);

    const messages = await connection.search(['ALL'], {
      bodies: [],
      struct: false,
    });

    if (messages.length === 0) {
      return 0;
    }

    // Get the highest UID
    const uids = messages.map((msg: any) => msg.attributes.uid);
    return Math.max(...uids);
  } catch (error) {
    console.error(`Failed to get last UID for ${folder}:`, error);
    return 0;
  }
}

/**
 * Close IMAP connection
 */
export function closeIMAPConnection(connection: ImapSimple): void {
  try {
    connection.end();
    console.log('✅ IMAP connection closed');
  } catch (error) {
    console.error('Error closing IMAP connection:', error);
  }
}

/**
 * Fastmail-specific IMAP configuration helper
 */
export function getFastmailIMAPConfig(email: string, password: string): IMAPConfig {
  return {
    host: 'imap.fastmail.com',
    port: 993,
    username: email,
    password: password,
    tls: true,
  };
}
