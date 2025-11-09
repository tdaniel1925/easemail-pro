# ============================================================================
# EaseMail Database Performance Indexes Migration Script (PowerShell)
# ============================================================================
# This script runs the performance indexes migration safely on Windows
# Usage: .\scripts\run-indexes-migration.ps1
# ============================================================================

Write-Host "🚀 EaseMail Database Performance Indexes Migration" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env.local
$envFile = ".env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "✅ Loaded environment from .env.local" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: .env.local file not found" -ForegroundColor Yellow
}

# Check if DATABASE_URL is set
$DATABASE_URL = $env:DATABASE_URL
if ([string]::IsNullOrEmpty($DATABASE_URL)) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable is not set" -ForegroundColor Red
    Write-Host "Please add it to your .env.local file or set it manually:" -ForegroundColor Yellow
    Write-Host "`$env:DATABASE_URL = 'postgresql://user:pass@host:port/database'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ DATABASE_URL found" -ForegroundColor Green
Write-Host ""

# Confirm before proceeding
Write-Host "⚠️  This will create ~150 database indexes" -ForegroundColor Yellow
Write-Host "⏱️  Estimated time: 10-30 minutes" -ForegroundColor Yellow
Write-Host "💡 Using CONCURRENTLY flag to avoid table locking" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Do you want to proceed? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Migration cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "📊 Running migration..." -ForegroundColor Cyan
Write-Host ""

# Check if psql is installed
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ ERROR: psql command not found" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools or use the Supabase SQL Editor" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Copy the SQL from db/migrations/001_add_performance_indexes.sql" -ForegroundColor Yellow
    Write-Host "and run it in Supabase Dashboard > SQL Editor" -ForegroundColor Yellow
    exit 1
}

# Run the migration
$migrationFile = "db\migrations\001_add_performance_indexes.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

try {
    Get-Content $migrationFile | psql $DATABASE_URL

    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Verifying indexes..." -ForegroundColor Cyan

    # Count indexes created
    $indexCountQuery = "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';"
    $indexCount = (psql $DATABASE_URL -t -c $indexCountQuery).Trim()

    Write-Host "✅ Total indexes in database: $indexCount" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Database performance indexes deployed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Monitor index usage in Supabase Dashboard > Database > Indexes" -ForegroundColor White
    Write-Host "2. Check query performance improvements in your application" -ForegroundColor White
    Write-Host "3. Update PRODUCTION_CHECKLIST.md" -ForegroundColor White
}
catch {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Tip: You can also run this migration manually in Supabase SQL Editor" -ForegroundColor Yellow
    exit 1
}
