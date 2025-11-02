/**
 * Wrapper to load .env file before running diagnostic
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// Now run the diagnostic
require('tsx/cli').default(['scripts/diagnose-nylas.ts']);

