/**
 * Database exports
 * Re-exports db instance and schema for clean imports
 */

export { db, migrationClient } from './drizzle';
export * from './schema';

