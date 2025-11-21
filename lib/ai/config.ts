/**
 * AI Configuration
 * Centralized settings for all AI features
 */

export const AI_CONFIG = {
  // Model Selection
  models: {
    default: 'gpt-4o' as const,
    fast: 'gpt-4o-mini' as const,
    legacy: 'gpt-4-turbo-preview' as const,
  },

  // Temperature Settings
  temperature: {
    creative: 0.9,      // For email composition, creative writing
    balanced: 0.7,      // For general assistant responses
    factual: 0.3,       // For data queries, sentiment analysis
    precise: 0.2,       // For intent detection, parsing
  },

  // Token Limits
  maxTokens: {
    chat: 800,
    composition: 500,
    parsing: 300,
    analysis: 400,
  },

  // Retry Configuration
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,      // 1 second
    maxDelay: 10000,         // 10 seconds
    backoffMultiplier: 2,
  },

  // Rate Limiting
  rateLimit: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
  },

  // Cost Tracking
  costs: {
    // Costs per 1M tokens (in USD)
    'gpt-4o': {
      input: 2.50,
      output: 10.00,
    },
    'gpt-4o-mini': {
      input: 0.15,
      output: 0.60,
    },
    'gpt-4-turbo-preview': {
      input: 10.00,
      output: 30.00,
    },
  },
} as const;

/**
 * Calculate cost for a given model and token usage
 */
export function calculateAICost(
  model: keyof typeof AI_CONFIG.costs,
  inputTokens: number,
  outputTokens: number
): number {
  const modelCost = AI_CONFIG.costs[model];
  if (!modelCost) return 0;

  const inputCost = (inputTokens / 1_000_000) * modelCost.input;
  const outputCost = (outputTokens / 1_000_000) * modelCost.output;

  return inputCost + outputCost;
}

/**
 * Get recommended model for a feature
 */
export function getModelForFeature(feature: string): string {
  const featureModelMap: Record<string, string> = {
    'assistant': AI_CONFIG.models.default,
    'email-composition': AI_CONFIG.models.default,
    'sentiment-analysis': AI_CONFIG.models.default,
    'intent-detection': AI_CONFIG.models.default,
    'calendar-parsing': AI_CONFIG.models.default,
    'dictation-polish': AI_CONFIG.models.default,
  };

  return featureModelMap[feature] || AI_CONFIG.models.default;
}
