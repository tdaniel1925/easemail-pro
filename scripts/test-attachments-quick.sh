#!/bin/bash
# EaseMail Attachments - Quick Test Script
# Run this to test all features

echo "🚀 EaseMail Attachments - Quick Test"
echo "===================================="
echo ""

echo "📦 Step 1: Installing dependencies..."
npm install

echo ""
echo "🌱 Step 2: Seeding test data..."
node scripts/seed-attachments.js

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Run: npm run dev"
echo "   2. Visit: http://localhost:3001/attachments"
echo "   3. Test:"
echo "      - Upload a file"
echo "      - Toggle AI on/off"
echo "      - Search for 'invoice'"
echo "      - Filter by document type"
echo "      - View usage dashboard"
echo ""
echo "📚 Documentation:"
echo "   - README_ATTACHMENTS_COMPLETE.md (start here)"
echo "   - FINAL_IMPLEMENTATION_SUMMARY.md (detailed)"
echo "   - COMPLETE_FIX_SUMMARY.md (quick reference)"
echo ""
echo "🎉 Happy testing!"

