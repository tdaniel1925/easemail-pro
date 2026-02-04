import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAtlasCloudClient } from '@/lib/atlascloud/client';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for image generation

/**
 * POST /api/marketing/generate-image
 * Generate marketing images using Atlas Cloud AI
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication (optional - only allow admins to generate images)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { type, prompt, model, width, height } = body;

    // Validate input
    if (!type && !prompt) {
      return NextResponse.json(
        { success: false, error: 'Either type or prompt is required' },
        { status: 400 }
      );
    }

    logger.general.info('Generating marketing image', {
      userId: user.id,
      type,
      hasCustomPrompt: !!prompt,
    });

    // Initialize Atlas Cloud client
    const atlasClient = getAtlasCloudClient();

    let result;

    if (type) {
      // Use predefined marketing image type
      const validTypes = ['hero', 'feature', 'testimonial', 'product', 'team'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }

      result = await atlasClient.generateMarketingImage(type, prompt);
    } else {
      // Use custom prompt
      result = await atlasClient.generateImage({
        model: model || 'black-forest-labs/flux-schnell',
        prompt,
        width: width || 1920,
        height: height || 1080,
      });
    }

    if (result.status === 'failed') {
      logger.general.error('Image generation failed', {
        error: result.error,
        requestId: result.request_id,
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Image generation failed',
        },
        { status: 500 }
      );
    }

    logger.general.info('Image generated successfully', {
      requestId: result.request_id,
      imageCount: result.output?.length || 0,
    });

    return NextResponse.json({
      success: true,
      requestId: result.request_id,
      images: result.output,
    });
  } catch (error: any) {
    logger.general.error('Error generating image', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
