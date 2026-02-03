/**
 * PayPal API Client
 *
 * Wrapper for PayPal REST API v2
 * Documentation: https://developer.paypal.com/api/rest/
 */

import { logger } from '@/lib/utils/logger';

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

interface PayPalAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface PayPalSubscription {
  id: string;
  status: 'APPROVAL_PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  plan_id: string;
  subscriber: {
    email_address: string;
    name?: {
      given_name: string;
      surname: string;
    };
  };
  billing_info?: {
    next_billing_time: string;
    last_payment?: {
      amount: {
        currency_code: string;
        value: string;
      };
      time: string;
    };
  };
}

interface PayPalPlan {
  id: string;
  name: string;
  status: 'CREATED' | 'INACTIVE' | 'ACTIVE';
  billing_cycles: Array<{
    frequency: {
      interval_unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
      interval_count: number;
    };
    tenure_type: 'REGULAR' | 'TRIAL';
    sequence: number;
    total_cycles: number;
    pricing_scheme: {
      fixed_price: {
        value: string;
        currency_code: string;
      };
    };
  }>;
}

export class PayPalClient {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  /**
   * Get PayPal OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`PayPal auth failed: ${response.status}`);
      }

      const data: PayPalAccessToken = await response.json();

      // Cache token (expires in 1 hour, refresh 5 min early)
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

      logger.payment.info('PayPal access token obtained');

      return data.access_token;
    } catch (error) {
      logger.payment.error('Failed to get PayPal access token', error);
      throw error;
    }
  }

  /**
   * Make authenticated request to PayPal API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.payment.error('PayPal API error', {
        endpoint,
        status: response.status,
        error: errorText,
      });
      throw new Error(`PayPal API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create a subscription plan
   */
  async createPlan(planData: {
    name: string;
    description: string;
    monthlyPrice: number;
    currency?: string;
  }): Promise<PayPalPlan> {
    const plan = await this.request<PayPalPlan>('/v1/billing/plans', {
      method: 'POST',
      body: JSON.stringify({
        product_id: process.env.PAYPAL_PRODUCT_ID, // Create product first in PayPal dashboard
        name: planData.name,
        description: planData.description,
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: {
              interval_unit: 'MONTH',
              interval_count: 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Infinite
            pricing_scheme: {
              fixed_price: {
                value: planData.monthlyPrice.toFixed(2),
                currency_code: planData.currency || 'USD',
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      }),
    });

    logger.payment.info('PayPal plan created', { planId: plan.id, name: planData.name });

    return plan;
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
    return this.request<PayPalSubscription>(
      `/v1/billing/subscriptions/${subscriptionId}`
    );
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    reason: string
  ): Promise<void> {
    await this.request(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });

    logger.payment.info('PayPal subscription cancelled', {
      subscriptionId,
      reason,
    });
  }

  /**
   * Suspend a subscription
   */
  async suspendSubscription(
    subscriptionId: string,
    reason: string
  ): Promise<void> {
    await this.request(`/v1/billing/subscriptions/${subscriptionId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });

    logger.payment.info('PayPal subscription suspended', {
      subscriptionId,
      reason,
    });
  }

  /**
   * Activate a subscription
   */
  async activateSubscription(
    subscriptionId: string,
    reason: string
  ): Promise<void> {
    await this.request(`/v1/billing/subscriptions/${subscriptionId}/activate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });

    logger.payment.info('PayPal subscription activated', {
      subscriptionId,
      reason,
    });
  }

  /**
   * Get plan details
   */
  async getPlan(planId: string): Promise<PayPalPlan> {
    return this.request<PayPalPlan>(`/v1/billing/plans/${planId}`);
  }

  /**
   * List all plans
   */
  async listPlans(): Promise<{ plans: PayPalPlan[] }> {
    return this.request<{ plans: PayPalPlan[] }>('/v1/billing/plans?page_size=20');
  }
}

// Singleton instance
export const paypalClient = new PayPalClient();
