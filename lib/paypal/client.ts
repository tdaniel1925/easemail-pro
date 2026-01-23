/**
 * PayPal REST API Client
 *
 * Direct REST API integration for PayPal Subscriptions API v1
 * (Official Node.js SDK is deprecated for subscriptions)
 *
 * Documentation: https://developer.paypal.com/docs/api/subscriptions/v1/
 */

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'production';
}

interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  cached_at: number;
}

class PayPalClient {
  private config: PayPalConfig;
  private baseUrl: string;
  private accessToken: PayPalAccessToken | null = null;

  constructor(config: PayPalConfig) {
    this.config = config;
    this.baseUrl = config.mode === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  /**
   * Get OAuth2 access token (cached for performance)
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken) {
      const now = Date.now();
      const expiresAt = this.accessToken.cached_at + (this.accessToken.expires_in * 1000);
      if (now < expiresAt - 300000) { // 5 minute buffer
        return this.accessToken.access_token;
      }
    }

    // Get new access token
    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal auth failed: ${error}`);
    }

    const data = await response.json();
    this.accessToken = {
      ...data,
      cached_at: Date.now(),
    };

    return this.accessToken!.access_token;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const accessToken = await this.getAccessToken();

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal API error: ${response.status} - ${error}`);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return {} as T;
  }

  // ============================================
  // CATALOG PRODUCTS API
  // ============================================

  /**
   * Create a product for subscriptions
   */
  async createProduct(product: {
    name: string;
    description?: string;
    type: 'SERVICE' | 'PHYSICAL' | 'DIGITAL';
    category?: string;
  }) {
    return this.request<{
      id: string;
      name: string;
      description?: string;
      type: string;
      category?: string;
      create_time: string;
    }>('POST', '/v1/catalogs/products', product);
  }

  /**
   * Get product details
   */
  async getProduct(productId: string) {
    return this.request<{
      id: string;
      name: string;
      description?: string;
      type: string;
      category?: string;
      create_time: string;
    }>('GET', `/v1/catalogs/products/${productId}`);
  }

  // ============================================
  // BILLING PLANS API
  // ============================================

  /**
   * Create a billing plan
   */
  async createPlan(plan: {
    product_id: string;
    name: string;
    description?: string;
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
    payment_preferences: {
      auto_bill_outstanding: boolean;
      setup_fee?: {
        value: string;
        currency_code: string;
      };
      setup_fee_failure_action?: 'CONTINUE' | 'CANCEL';
      payment_failure_threshold?: number;
    };
  }) {
    return this.request<{
      id: string;
      product_id: string;
      name: string;
      description?: string;
      status: string;
      billing_cycles: any[];
      payment_preferences: any;
      create_time: string;
    }>('POST', '/v1/billing/plans', plan);
  }

  /**
   * Get plan details
   */
  async getPlan(planId: string) {
    return this.request<{
      id: string;
      product_id: string;
      name: string;
      description?: string;
      status: string;
      billing_cycles: any[];
      payment_preferences: any;
      create_time: string;
    }>('GET', `/v1/billing/plans/${planId}`);
  }

  /**
   * Update plan pricing
   */
  async updatePlanPricing(planId: string, pricing: {
    billing_cycle_sequence: number;
    pricing_scheme: {
      fixed_price: {
        value: string;
        currency_code: string;
      };
    };
  }) {
    return this.request<void>('POST', `/v1/billing/plans/${planId}/update-pricing-schemes`, {
      pricing_schemes: [pricing],
    });
  }

  // ============================================
  // SUBSCRIPTIONS API
  // ============================================

  /**
   * Create a subscription
   */
  async createSubscription(subscription: {
    plan_id: string;
    quantity?: string;
    subscriber?: {
      email_address?: string;
      name?: {
        given_name?: string;
        surname?: string;
      };
    };
    application_context?: {
      brand_name?: string;
      locale?: string;
      shipping_preference?: 'GET_FROM_FILE' | 'NO_SHIPPING' | 'SET_PROVIDED_ADDRESS';
      user_action?: 'SUBSCRIBE_NOW' | 'CONTINUE';
      payment_method?: {
        payer_selected?: 'PAYPAL';
        payee_preferred?: 'IMMEDIATE_PAYMENT_REQUIRED' | 'UNRESTRICTED';
      };
      return_url?: string;
      cancel_url?: string;
    };
    custom_id?: string;
  }) {
    return this.request<{
      id: string;
      status: string;
      status_update_time: string;
      plan_id: string;
      start_time?: string;
      quantity?: string;
      links: Array<{
        href: string;
        rel: string;
        method: string;
      }>;
    }>('POST', '/v1/billing/subscriptions', subscription);
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    return this.request<{
      id: string;
      plan_id: string;
      status: string;
      status_update_time: string;
      start_time: string;
      quantity?: string;
      subscriber?: {
        email_address?: string;
        name?: {
          given_name?: string;
          surname?: string;
        };
      };
      billing_info?: {
        outstanding_balance?: {
          currency_code: string;
          value: string;
        };
        cycle_executions?: Array<{
          tenure_type: string;
          sequence: number;
          cycles_completed: number;
          cycles_remaining?: number;
          current_pricing_scheme_version?: number;
        }>;
        last_payment?: {
          amount: {
            currency_code: string;
            value: string;
          };
          time: string;
        };
        next_billing_time?: string;
        final_payment_time?: string;
        failed_payments_count?: number;
      };
      create_time: string;
      update_time: string;
      links: Array<{
        href: string;
        rel: string;
        method: string;
      }>;
    }>('GET', `/v1/billing/subscriptions/${subscriptionId}`);
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, reason?: string) {
    return this.request<void>('POST', `/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      reason: reason || 'Customer requested cancellation',
    });
  }

  /**
   * Suspend a subscription
   */
  async suspendSubscription(subscriptionId: string, reason?: string) {
    return this.request<void>('POST', `/v1/billing/subscriptions/${subscriptionId}/suspend`, {
      reason: reason || 'Temporary suspension',
    });
  }

  /**
   * Activate a suspended subscription
   */
  async activateSubscription(subscriptionId: string, reason?: string) {
    return this.request<void>('POST', `/v1/billing/subscriptions/${subscriptionId}/activate`, {
      reason: reason || 'Reactivation requested',
    });
  }

  /**
   * Revise subscription (change plan or quantity)
   */
  async reviseSubscription(subscriptionId: string, revision: {
    plan_id?: string;
    quantity?: string;
  }) {
    return this.request<{
      id: string;
      plan_id: string;
      status: string;
      links: Array<{
        href: string;
        rel: string;
        method: string;
      }>;
    }>('POST', `/v1/billing/subscriptions/${subscriptionId}/revise`, revision);
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(
    webhookEvent: any,
    headers: {
      'paypal-transmission-id': string;
      'paypal-transmission-time': string;
      'paypal-transmission-sig': string;
      'paypal-cert-url': string;
      'paypal-auth-algo': string;
    },
    webhookId: string
  ): Promise<boolean> {
    try {
      const result = await this.request<{
        verification_status: string;
      }>('POST', '/v1/notifications/verify-webhook-signature', {
        transmission_id: headers['paypal-transmission-id'],
        transmission_time: headers['paypal-transmission-time'],
        cert_url: headers['paypal-cert-url'],
        auth_algo: headers['paypal-auth-algo'],
        transmission_sig: headers['paypal-transmission-sig'],
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      });

      return result.verification_status === 'SUCCESS';
    } catch (error) {
      console.error('[PayPal] Webhook verification failed:', error);
      return false;
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let paypalClient: PayPalClient | null = null;

export function getPayPalClient(): PayPalClient {
  if (!paypalClient) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = (process.env.PAYPAL_MODE || 'sandbox') as 'sandbox' | 'production';

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET');
    }

    paypalClient = new PayPalClient({
      clientId,
      clientSecret,
      mode,
    });
  }

  return paypalClient;
}

export { PayPalClient };
