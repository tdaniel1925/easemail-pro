import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// IMPORTANT: Supabase connection string format
// If experiencing timeouts on port 6543, use direct connection on port 5432:
// postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
// 
// For high-traffic serverless (if 5432 works fine):
// postgresql://postgres:[password]@db.[project-ref].supabase.co:6543/postgres?pgbouncer=true
const connectionString = process.env.DATABASE_URL!;

// Configure connection pool with production-ready limits
const queryClient = postgres(connectionString, {
  max: 20, // Maximum connections
  idle_timeout: 30, // Keep connections alive longer
  connect_timeout: 30, // Increased from 10 to handle Supabase latency
  max_lifetime: 60 * 30, // Close after 30 minutes
  fetch_types: false, // Better performance
  prepare: false, // Disable for serverless (required for pgbouncer mode)
  onnotice: () => {}, // Suppress PostgreSQL notices
  connection: {
    application_name: 'easemail_vercel', // Help identify connections in Supabase dashboard
  },
});

export const db = drizzle(queryClient, { schema });

// For migrations - single connection
export const migrationClient = postgres(connectionString, { max: 1 });


