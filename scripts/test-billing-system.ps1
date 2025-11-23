# Billing System Test Script (PowerShell)
# Tests all billing endpoints to verify functionality

# Configuration
$BaseUrl = "http://localhost:3001"
$CronSecret = "aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK"

Write-Host "🧪 Testing EaseMail Billing System..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣  Testing billing health monitoring..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/cron/monitor-billing" -Method Get
    if ($response.success) {
        Write-Host "✅ Health check passed" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
    }
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Usage Tracking Cron
Write-Host "2️⃣  Testing usage tracking cron job..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $CronSecret"
    }
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/cron/track-usage" -Method Post -Headers $headers
    if ($response.success) {
        Write-Host "✅ Usage tracking passed" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
    }
} catch {
    Write-Host "❌ Usage tracking failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Billing Monitoring Cron
Write-Host "3️⃣  Testing billing monitoring cron job..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $CronSecret"
    }
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/cron/monitor-billing" -Method Post -Headers $headers
    if ($response.success) {
        Write-Host "✅ Billing monitoring passed" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
    }
} catch {
    Write-Host "❌ Billing monitoring failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Check if endpoints exist
Write-Host "4️⃣  Checking billing API endpoints..." -ForegroundColor Yellow

$endpoints = @(
    "/api/billing/payment-methods",
    "/api/billing/usage",
    "/api/billing/invoices"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl$endpoint" -Method Get -ErrorAction Stop
        Write-Host "✅ $endpoint exists" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "✅ $endpoint exists (requires auth)" -ForegroundColor Green
        } else {
            Write-Host "❌ $endpoint returned $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
    }
}
Write-Host ""

# Test 5: Environment Variables
Write-Host "5️⃣  Checking environment variables..." -ForegroundColor Yellow

$envVars = @{
    "RESEND_API_KEY" = $env:RESEND_API_KEY
    "CRON_SECRET" = $env:CRON_SECRET
    "STRIPE_SECRET_KEY" = $env:STRIPE_SECRET_KEY
    "DATABASE_URL" = $env:DATABASE_URL
}

foreach ($var in $envVars.GetEnumerator()) {
    if ([string]::IsNullOrEmpty($var.Value)) {
        if ($var.Key -eq "STRIPE_SECRET_KEY") {
            Write-Host "⚠️  $($var.Key) not set (optional for testing)" -ForegroundColor Yellow
        } else {
            Write-Host "❌ $($var.Key) not set" -ForegroundColor Red
        }
    } else {
        Write-Host "✅ $($var.Key) is configured" -ForegroundColor Green
    }
}
Write-Host ""

# Summary
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "🎉 Billing System Test Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:"
Write-Host "1. Run database migration (see migrations/add_billing_address.sql)"
Write-Host "2. Add Stripe keys to .env.local (optional for testing)"
Write-Host "3. Deploy to Vercel (cron jobs will run automatically)"
Write-Host ""
Write-Host "For detailed setup guide, see: BILLING_SETUP_COMPLETE.md"
