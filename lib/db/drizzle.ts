import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Configure connection pool with production-ready limits
const queryClient = postgres(connectionString, {
  max: 20, // Increased from 10 to handle webhook traffic
  idle_timeout: 30, // Keep connections alive longer to reduce overhead
  connect_timeout: 10, // Connection timeout
  max_lifetime: 60 * 30, // Close connections after 30 minutes
  fetch_types: false, // Disable type fetching for better performance
  prepare: false, // Disable prepared statements for serverless environments
  onnotice: () => {}, // Suppress PostgreSQL notices to reduce noise
});

export const db = drizzle(queryClient, { schema });

// For migrations - single connection
export const migrationClient = postgres(connectionString, { max: 1 });


