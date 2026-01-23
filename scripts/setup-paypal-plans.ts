/**
 * PayPal Billing Plans Setup Script
 *
 * This script creates PayPal products and billing plans for EaseMail subscriptions.
 * Run this ONCE after setting up PayPal credentials.
 *
 * Usage:
 *   npx tsx scripts/setup-paypal-plans.ts
 */

import { getPayPalClient } from '../lib/paypal/client';
import { db } from '../lib/db/drizzle';
import { paypalBillingPlans } from '../lib/db/schema';

// EaseMail pricing (same as Stripe)
const PLANS = {
  individual: {
    monthly: 45.00,
    annual: 36.00, // $36/month billed annually ($432/year)
  },
  team: {
    monthly: 40.50, // 10% discount per seat
    annual: 32.40,  // 10% discount + annual discount
  },
};

async function setupPayPalPlans() {
  try {
    console.log('🚀 Starting PayPal billing plans setup...\n');

    const paypal = getPayPalClient();

    // ============================================
    // 1. CREATE PRODUCTS
    // ============================================

    console.log('📦 Creating PayPal products...');

    const individualProduct = await paypal.createProduct({
      name: 'EaseMail Individual Plan',
      description: 'Professional email and SMS management for individuals',
      type: 'SERVICE',
      category: 'SOFTWARE',
    });

    console.log(`✅ Individual product created: ${individualProduct.id}`);

    const teamProduct = await paypal.createProduct({
      name: 'EaseMail Team Plan',
      description: 'Collaborative email and SMS management for teams',
      type: 'SERVICE',
      category: 'SOFTWARE',
    });

    console.log(`✅ Team product created: ${teamProduct.id}\n`);

    // ============================================
    // 2. CREATE BILLING PLANS
    // ============================================

    console.log('💳 Creating PayPal billing plans...\n');

    const plansToCreate = [
      // Individual Monthly
      {
        planId: 'individual',
        billingCycle: 'monthly',
        productId: individualProduct.id,
        name: 'EaseMail Individual - Monthly',
        description: 'Individual plan billed monthly at $45/month',
        price: PLANS.individual.monthly,
        interval: 'MONTH' as const,
        intervalCount: 1,
      },
      // Individual Annual
      {
        planId: 'individual',
        billingCycle: 'annual',
        productId: individualProduct.id,
        name: 'EaseMail Individual - Annual',
        description: 'Individual plan billed annually at $36/month ($432/year)',
        price: PLANS.individual.annual * 12, // Annual total
        interval: 'YEAR' as const,
        intervalCount: 1,
      },
      // Team Monthly
      {
        planId: 'team',
        billingCycle: 'monthly',
        productId: teamProduct.id,
        name: 'EaseMail Team - Monthly (per seat)',
        description: 'Team plan billed monthly at $40.50/seat/month',
        price: PLANS.team.monthly,
        interval: 'MONTH' as const,
        intervalCount: 1,
      },
      // Team Annual
      {
        planId: 'team',
        billingCycle: 'annual',
        productId: teamProduct.id,
        name: 'EaseMail Team - Annual (per seat)',
        description: 'Team plan billed annually at $32.40/seat/month ($388.80/seat/year)',
        price: PLANS.team.annual * 12, // Annual total
        interval: 'YEAR' as const,
        intervalCount: 1,
      },
    ];

    for (const planData of plansToCreate) {
      console.log(`Creating ${planData.planId} ${planData.billingCycle} plan...`);

      const plan = await paypal.createPlan({
        product_id: planData.productId,
        name: planData.name,
        description: planData.description,
        billing_cycles: [
          {
            frequency: {
              interval_unit: planData.interval,
              interval_count: planData.intervalCount,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Infinite cycles
            pricing_scheme: {
              fixed_price: {
                value: planData.price.toFixed(2),
                currency_code: 'USD',
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      });

      console.log(`✅ Plan created: ${plan.id}`);

      // Store in database
      await db.insert(paypalBillingPlans).values({
        planId: planData.planId,
        billingCycle: planData.billingCycle as 'monthly' | 'annual',
        paypalProductId: planData.productId,
        paypalPlanId: plan.id,
        pricePerSeat: (planData.billingCycle === 'annual'
          ? (planData.price / 12).toFixed(2)
          : planData.price.toFixed(2)),
        currency: 'USD',
        status: 'active',
      });

      console.log(`✅ Plan saved to database\n`);
    }

    // ============================================
    // 3. SUMMARY
    // ============================================

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ PayPal billing plans setup complete!\n');
    console.log('Products created:');
    console.log(`  - Individual: ${individualProduct.id}`);
    console.log(`  - Team: ${teamProduct.id}\n`);
    console.log('Plans created:');
    console.log('  - Individual Monthly ($45/month)');
    console.log('  - Individual Annual ($36/month, billed $432/year)');
    console.log('  - Team Monthly ($40.50/seat/month)');
    console.log('  - Team Annual ($32.40/seat/month, billed $388.80/seat/year)\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n✨ Next steps:');
    console.log('1. Configure PayPal webhook in dashboard');
    console.log('2. Add PAYPAL_WEBHOOK_ID to environment variables');
    console.log('3. Test subscription flow with PayPal sandbox');
    console.log('4. Update frontend to use PayPal buttons');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error setting up PayPal plans:', error);
    process.exit(1);
  }
}

// Run the setup
setupPayPalPlans()
  .then(() => {
    console.log('✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
