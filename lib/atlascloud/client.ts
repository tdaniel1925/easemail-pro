/**
 * Atlas Cloud AI Client
 * For image generation using Flux and other AI models
 */

export interface AtlasCloudImageOptions {
  model?: string;
  prompt: string;
  width?: number;
  height?: number;
  num_outputs?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
  seed?: number;
}

export interface AtlasCloudImageResponse {
  request_id: string;
  status: 'pending' | 'completed' | 'failed';
  output?: string[]; // Array of image URLs
  error?: string;
}

/**
 * Atlas Cloud AI Client
 */
export class AtlasCloudClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.atlascloud.ai/api/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ATLASCLOUD_API_KEY || '';

    if (!this.apiKey) {
      console.warn('⚠️ Atlas Cloud API key not configured');
    }
  }

  /**
   * Generate an image using text-to-image models
   */
  async generateImage(options: AtlasCloudImageOptions): Promise<AtlasCloudImageResponse> {
    if (!this.apiKey) {
      throw new Error('Atlas Cloud API key is required');
    }

    const {
      model = 'black-forest-labs/flux-schnell', // Default to Flux Schnell (fastest)
      prompt,
      width = 1024,
      height = 1024,
      num_outputs = 1,
      guidance_scale,
      num_inference_steps,
      seed,
    } = options;

    try {
      // Step 1: Create the generation request
      const response = await fetch(`${this.baseUrl}/model/generateImage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt,
          width,
          height,
          num_outputs,
          ...(guidance_scale && { guidance_scale }),
          ...(num_inference_steps && { num_inference_steps }),
          ...(seed && { seed }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Atlas Cloud API error: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      const data = await response.json();

      // If response contains request_id, we need to poll for results
      if (data.request_id) {
        return await this.pollForResult(data.request_id);
      }

      // Some models return images directly
      return {
        request_id: data.request_id || 'direct',
        status: 'completed',
        output: data.output || data.images || [data.image],
      };
    } catch (error: any) {
      console.error('Atlas Cloud image generation error:', error);
      throw error;
    }
  }

  /**
   * Poll for generation result
   */
  private async pollForResult(
    requestId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<AtlasCloudImageResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(
          `${this.baseUrl}/model/prediction/${requestId}`,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to get result: ${response.status}`);
        }

        const data = await response.json();

        // Check if completed
        if (data.status === 'completed' || data.status === 'succeeded') {
          return {
            request_id: requestId,
            status: 'completed',
            output: data.output || data.images || [data.image],
          };
        }

        // Check if failed
        if (data.status === 'failed' || data.status === 'error') {
          return {
            request_id: requestId,
            status: 'failed',
            error: data.error || 'Generation failed',
          };
        }

        // Still processing, wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      } catch (error: any) {
        console.error(`Polling attempt ${attempt + 1} failed:`, error);

        // If it's the last attempt, throw
        if (attempt === maxAttempts - 1) {
          throw error;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error('Image generation timed out');
  }

  /**
   * Generate marketing images with predefined prompts
   */
  async generateMarketingImage(
    type: 'hero' | 'feature' | 'testimonial' | 'product' | 'team',
    customPrompt?: string
  ): Promise<AtlasCloudImageResponse> {
    const prompts = {
      hero: 'Professional modern email interface with AI assistant, clean design, gradient blue and white colors, futuristic dashboard, high quality, digital art, 4k',
      feature: 'Email productivity icons and interface elements, AI assistant helping with emails, modern UI design, clean and minimalist, professional business setting',
      testimonial: 'Happy professional business person using laptop in modern office, smiling, natural lighting, professional photo quality, corporate environment',
      product: 'Beautiful email application interface on laptop screen, modern design, AI features highlighted, sleek and professional, product photography style',
      team: 'Diverse professional team collaborating in modern office, happy and productive, natural lighting, corporate photography style, high quality',
    };

    const prompt = customPrompt || prompts[type];

    return await this.generateImage({
      model: 'black-forest-labs/flux-dev', // Use Flux Dev for higher quality
      prompt,
      width: 1920,
      height: 1080,
      guidance_scale: 7.5,
      num_inference_steps: 28,
    });
  }
}

/**
 * Get a configured Atlas Cloud client instance
 */
export function getAtlasCloudClient(apiKey?: string): AtlasCloudClient {
  return new AtlasCloudClient(apiKey);
}
