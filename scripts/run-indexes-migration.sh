#!/bin/bash

# ============================================================================
# EaseMail Database Performance Indexes Migration Script
# ============================================================================
# This script runs the performance indexes migration safely
# Usage: ./scripts/run-indexes-migration.sh
# ============================================================================

set -e  # Exit on error

echo "🚀 EaseMail Database Performance Indexes Migration"
echo "=================================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set it in your .env.local file or export it:"
    echo "export DATABASE_URL='postgresql://user:pass@host:port/database'"
    exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Confirm before proceeding
echo "⚠️  This will create ~150 database indexes"
echo "⏱️  Estimated time: 10-30 minutes"
echo "💡 Using CONCURRENTLY flag to avoid table locking"
echo ""
read -p "Do you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "📊 Running migration..."
echo ""

# Run the migration
psql "$DATABASE_URL" < "db/migrations/001_add_performance_indexes.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📊 Verifying indexes..."

    # Count indexes created
    INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';")

    echo "✅ Total indexes in database: $INDEX_COUNT"
    echo ""
    echo "🎉 Database performance indexes deployed!"
    echo ""
    echo "Next steps:"
    echo "1. Monitor index usage: SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public' ORDER BY idx_scan DESC;"
    echo "2. Check query performance improvements in your application"
    echo "3. Update PRODUCTION_CHECKLIST.md"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above and try again"
    exit 1
fi
