# EaseMail Attachments - Quick Test Script (Windows)
# Run this to test all features: .\scripts\test-attachments-quick.ps1

Write-Host "🚀 EaseMail Attachments - Quick Test" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "🌱 Step 2: Seeding test data..." -ForegroundColor Yellow
node scripts/seed-attachments.js

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Run: npm run dev"
Write-Host "   2. Visit: http://localhost:3001/attachments"
Write-Host "   3. Test:" -ForegroundColor Yellow
Write-Host "      - Upload a file"
Write-Host "      - Toggle AI on/off"
Write-Host "      - Search for 'invoice'"
Write-Host "      - Filter by document type"
Write-Host "      - View usage dashboard"
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - README_ATTACHMENTS_COMPLETE.md (start here)"
Write-Host "   - FINAL_IMPLEMENTATION_SUMMARY.md (detailed)"
Write-Host "   - COMPLETE_FIX_SUMMARY.md (quick reference)"
Write-Host ""
Write-Host "🎉 Happy testing!" -ForegroundColor Green

