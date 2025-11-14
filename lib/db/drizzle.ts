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

// ✅ CRITICAL FIX: Optimized connection pool for serverless + webhook volume
// Supabase Session Mode has strict connection limits - MUST be very conservative
const queryClient = postgres(connectionString, {
  max: 1, // ✅ CRITICAL: Session mode requires minimal connections per serverless function
  idle_timeout: 10, // ✅ Release connections very quickly (serverless is stateless)
  connect_timeout: 30, // Allow time for pooler connections
  max_lifetime: 60 * 2, // Rotate connections every 2 min (prevent stale connections)
  fetch_types: false, // Better performance
  prepare: false, // REQUIRED for pgbouncer/pooler mode
  onnotice: () => {}, // Suppress PostgreSQL notices
  transform: {
    undefined: null, // Transform undefined to null for cleaner queries
  },
  connection: {
    application_name: 'easemail_vercel', // Help identify connections in Supabase dashboard
  },
});

export const db = drizzle(queryClient, { schema });

// For migrations - single connection
export const migrationClient = postgres(connectionString, { max: 1 });


