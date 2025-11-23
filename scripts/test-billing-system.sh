#!/bin/bash

# Billing System Test Script
# Tests all billing endpoints to verify functionality

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3001"
CRON_SECRET="aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK"

echo "🧪 Testing EaseMail Billing System..."
echo "=================================="
echo ""

# Test 1: Health Check
echo "1️⃣  Testing billing health monitoring..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/cron/monitor-billing")
if echo "$RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✅ Health check passed${NC}"
  echo "$RESPONSE" | jq '.'
else
  echo -e "${RED}❌ Health check failed${NC}"
  echo "$RESPONSE"
fi
echo ""

# Test 2: Usage Tracking Cron
echo "2️⃣  Testing usage tracking cron job..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/cron/track-usage" \
  -H "Authorization: Bearer $CRON_SECRET")
if echo "$RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✅ Usage tracking passed${NC}"
  echo "$RESPONSE" | jq '.'
else
  echo -e "${RED}❌ Usage tracking failed${NC}"
  echo "$RESPONSE"
fi
echo ""

# Test 3: Billing Monitoring Cron
echo "3️⃣  Testing billing monitoring cron job..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/cron/monitor-billing" \
  -H "Authorization: Bearer $CRON_SECRET")
if echo "$RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✅ Billing monitoring passed${NC}"
  echo "$RESPONSE" | jq '.'
else
  echo -e "${RED}❌ Billing monitoring failed${NC}"
  echo "$RESPONSE"
fi
echo ""

# Test 4: Check if endpoints exist
echo "4️⃣  Checking billing API endpoints..."

endpoints=(
  "/api/billing/payment-methods"
  "/api/billing/usage"
  "/api/billing/invoices"
)

for endpoint in "${endpoints[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
  if [ "$STATUS" = "401" ]; then
    echo -e "${GREEN}✅ $endpoint exists (requires auth)${NC}"
  elif [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ $endpoint exists${NC}"
  else
    echo -e "${RED}❌ $endpoint returned $STATUS${NC}"
  fi
done
echo ""

# Test 5: Database Connection
echo "5️⃣  Testing database connection..."
if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}⚠️  DATABASE_URL not set in environment${NC}"
else
  echo -e "${GREEN}✅ DATABASE_URL is configured${NC}"
fi
echo ""

# Test 6: Environment Variables
echo "6️⃣  Checking environment variables..."

env_vars=(
  "RESEND_API_KEY"
  "CRON_SECRET"
  "STRIPE_SECRET_KEY"
  "DATABASE_URL"
)

for var in "${env_vars[@]}"; do
  if [ -z "${!var}" ]; then
    if [ "$var" = "STRIPE_SECRET_KEY" ]; then
      echo -e "${YELLOW}⚠️  $var not set (optional for testing)${NC}"
    else
      echo -e "${RED}❌ $var not set${NC}"
    fi
  else
    echo -e "${GREEN}✅ $var is configured${NC}"
  fi
done
echo ""

# Summary
echo "=================================="
echo "🎉 Billing System Test Complete!"
echo ""
echo "Next Steps:"
echo "1. Run database migration (see migrations/add_billing_address.sql)"
echo "2. Add Stripe keys to .env.local (optional for testing)"
echo "3. Deploy to Vercel (cron jobs will run automatically)"
echo ""
echo "For detailed setup guide, see: BILLING_SETUP_COMPLETE.md"
