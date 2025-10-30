import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Configure connection pool with proper limits
const queryClient = postgres(connectionString, {
  max: 10, // Maximum number of connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout
});

export const db = drizzle(queryClient, { schema });

// For migrations - single connection
export const migrationClient = postgres(connectionString, { max: 1 });


