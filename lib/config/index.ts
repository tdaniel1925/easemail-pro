import { db } from '@/lib/db/drizzle';
import { systemSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get a configuration value, prioritizing database over environment variables
 * 
 * Priority order:
 * 1. Database (system_settings table) - Set via admin panel
 * 2. Environment variables (.env.local or production env)
 * 
 * This allows admins to override environment variables without redeployment
 */
export async function getConfig(key: string): Promise<string | undefined> {
  try {
    // First, try to get from database
    const setting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key),
    });

    if (setting && setting.value) {
      return setting.value;
    }

    // Fallback to environment variable
    return process.env[key];
  } catch (error) {
    console.warn(`Failed to fetch config for ${key}, falling back to env:`, error);
    // On error, fallback to environment variable
    return process.env[key];
  }
}

/**
 * Get multiple config values at once
 */
export async function getConfigs(keys: string[]): Promise<Record<string, string | undefined>> {
  const configs: Record<string, string | undefined> = {};
  
  for (const key of keys) {
    configs[key] = await getConfig(key);
  }
  
  return configs;
}

/**
 * Check if a config key exists (in either database or env)
 */
export async function hasConfig(key: string): Promise<boolean> {
  const value = await getConfig(key);
  return value !== undefined && value !== '';
}

/**
 * Get config with a default value
 */
export async function getConfigWithDefault(key: string, defaultValue: string): Promise<string> {
  const value = await getConfig(key);
  return value || defaultValue;
}

/**
 * Sync version - use only in non-async contexts (uses env only)
 * For async contexts, use getConfig() which checks database first
 */
export function getConfigSync(key: string): string | undefined {
  return process.env[key];
}

