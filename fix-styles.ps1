# Emergency Styling Fix Script
# Run this if styles are broken

Write-Host "🚨 FIXING STYLING ISSUES..." -ForegroundColor Yellow
Write-Host ""

# Step 1: Stop any running dev servers
Write-Host "1. Stopping any running dev servers..." -ForegroundColor Cyan
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*EaseMail*"} | Stop-Process -Force
Start-Sleep -Seconds 2

# Step 2: Clear Next.js cache
Write-Host "2. Clearing Next.js cache..." -ForegroundColor Cyan
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Write-Host "   ✓ .next folder cleared" -ForegroundColor Green

# Step 3: Clear node_modules/.cache (if exists)
Write-Host "3. Clearing node module caches..." -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue
Write-Host "   ✓ Module cache cleared" -ForegroundColor Green

# Step 4: Verify critical files exist
Write-Host "4. Verifying critical files..." -ForegroundColor Cyan
$files = @(
    "app/globals.css",
    "app/layout.tsx",
    "tailwind.config.ts",
    "postcss.config.js"
)

$allExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "   ✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $file MISSING!" -ForegroundColor Red
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Host ""
    Write-Host "❌ CRITICAL FILES MISSING! Cannot proceed." -ForegroundColor Red
    exit 1
}

# Step 5: Verify CSS import in layout
Write-Host "5. Verifying CSS import in layout.tsx..." -ForegroundColor Cyan
$layoutContent = Get-Content app/layout.tsx -Raw
if ($layoutContent -match 'import\s+["\']\.\/globals\.css["\']') {
    Write-Host "   ✓ CSS import found in layout.tsx" -ForegroundColor Green
} else {
    Write-Host "   ✗ CSS import MISSING from layout.tsx!" -ForegroundColor Red
    Write-Host "   Adding CSS import..." -ForegroundColor Yellow
    $layoutContent = $layoutContent -replace '(import\s+type\s+\{\s*Metadata\s*\}\s+from\s+[""]next[""];)', "`$1`nimport `"./globals.css`";"
    Set-Content app/layout.tsx $layoutContent
    Write-Host "   ✓ CSS import added" -ForegroundColor Green
}

# Step 6: Restart dev server
Write-Host "6. Starting dev server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "✅ STYLING FIX COMPLETE!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""
Write-Host "📋 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "   1. Dev server is starting..." -ForegroundColor White
Write-Host "   2. Wait for 'Ready' message" -ForegroundColor White
Write-Host "   3. Hard refresh browser: Ctrl+Shift+R" -ForegroundColor White
Write-Host "   4. Check if styles are working" -ForegroundColor White
Write-Host ""

# Start dev server
npm run dev

