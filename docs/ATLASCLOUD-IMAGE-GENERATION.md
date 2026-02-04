# Atlas Cloud AI Image Generation

Atlas Cloud AI integration for generating high-quality marketing images using Flux and other AI models.

## Setup

### 1. Get API Key

1. Sign up at [Atlas Cloud](https://console.atlascloud.ai)
2. Navigate to API Keys in your dashboard
3. Generate a new API key

### 2. Configure Environment

Add to your `.env.local`:

```bash
ATLASCLOUD_API_KEY=your_atlascloud_api_key_here
```

## Usage

### From API Endpoint

**Generate with predefined marketing types:**

```bash
curl -X POST "http://localhost:3001/api/marketing/generate-image" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "type": "hero"
  }'
```

**Available types:**
- `hero` - Hero section images (email interface with AI)
- `feature` - Feature section images (AI assistant helping)
- `testimonial` - Professional testimonial photos
- `product` - Product showcase images
- `team` - Team collaboration photos

**Generate with custom prompt:**

```bash
curl -X POST "http://localhost:3001/api/marketing/generate-image" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "prompt": "Modern email dashboard with AI features, blue gradient, professional",
    "width": 1920,
    "height": 1080,
    "model": "black-forest-labs/flux-dev"
  }'
```

### From TypeScript/JavaScript

```typescript
import { getAtlasCloudClient } from '@/lib/atlascloud/client';

// Generate marketing image
const client = getAtlasCloudClient();
const result = await client.generateMarketingImage('hero');

if (result.status === 'completed') {
  console.log('Images:', result.output);
  // result.output is an array of image URLs
}

// Generate with custom prompt
const customResult = await client.generateImage({
  model: 'black-forest-labs/flux-schnell', // Fast model
  prompt: 'Professional email interface with AI assistant',
  width: 1920,
  height: 1080,
});
```

## Available Models

### Flux Models

**flux-schnell** (Fastest - Recommended for quick generations)
- Speed: ~3 seconds
- Quality: Good
- Cost: Lowest

**flux-dev** (High Quality - Recommended for marketing)
- Speed: ~15 seconds
- Quality: Excellent
- Cost: Medium

**flux-1.1-pro** (Best Quality)
- Speed: ~30 seconds
- Quality: Outstanding
- Cost: Highest

## Image Specifications

### Recommended Sizes

- **Hero Images**: 1920x1080 (Full HD)
- **Feature Images**: 1200x800
- **Product Shots**: 1024x1024
- **Testimonials**: 800x800
- **Icons/Thumbnails**: 512x512

### Best Practices

1. **Be Specific**: Include style, colors, mood, and context in prompts
2. **Use Keywords**: "professional", "modern", "clean", "gradient", "4k"
3. **Specify Quality**: Add "high quality", "detailed", "sharp" to prompts
4. **Set Style**: "digital art", "photograph", "illustration", "corporate"

### Example Prompts

```typescript
// Hero Section
"Modern email application interface, AI assistant sidebar,
blue gradient background, clean design, professional,
futuristic dashboard, high quality digital art, 4k"

// Feature Showcase
"Email productivity icons floating in 3D space,
AI assistant robot helping with emails, modern UI design,
blue and white colors, minimalist, professional"

// Product Screenshot
"Laptop displaying beautiful email interface,
AI features highlighted with glowing effects,
modern office desk, natural lighting, product photography"

// Team Photo
"Diverse professional team collaborating in modern office,
using laptops, smiling, natural lighting, corporate photo,
high quality, professional photography"
```

## Pricing

Atlas Cloud uses pay-per-use pricing:

- **Flux Schnell**: ~$0.001-0.002 per image
- **Flux Dev**: ~$0.02-0.03 per image
- **Flux Pro**: ~$0.04-0.05 per image

Check [Atlas Cloud Pricing](https://www.atlascloud.ai/pricing) for current rates.

## Error Handling

```typescript
try {
  const result = await client.generateImage({
    prompt: "Your prompt here",
  });

  if (result.status === 'failed') {
    console.error('Generation failed:', result.error);
  } else {
    console.log('Success:', result.output);
  }
} catch (error) {
  console.error('API error:', error);
}
```

## Tips for Marketing Images

### 1. Color Consistency
Use your brand colors in prompts:
```
"blue gradient (#4C6B9A to #3A5276), professional email interface"
```

### 2. Style Consistency
Maintain consistent style across all images:
```
"modern, clean, minimalist, professional, digital art style"
```

### 3. Context Matters
Include context for better results:
```
"email inbox with AI assistant, business professional using it,
modern office environment, natural lighting"
```

### 4. Iterate and Refine
- Start with flux-schnell for quick previews
- Refine prompt based on results
- Use flux-dev for final high-quality images

## Integration with Marketing Site

Add generated images to your marketing pages:

```tsx
// In your marketing component
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="hero">
      <Image
        src="/images/marketing/hero-ai-generated.png"
        alt="EaseMail Dashboard"
        width={1920}
        height={1080}
        priority
      />
    </section>
  );
}
```

## Advanced Usage

### Batch Generation

```typescript
const types = ['hero', 'feature', 'product', 'team'];
const images = await Promise.all(
  types.map(type => client.generateMarketingImage(type))
);
```

### Custom Parameters

```typescript
const result = await client.generateImage({
  model: 'black-forest-labs/flux-dev',
  prompt: 'Your detailed prompt',
  width: 1920,
  height: 1080,
  guidance_scale: 7.5,      // How closely to follow prompt (1-20)
  num_inference_steps: 28,  // Quality vs speed tradeoff
  seed: 42,                 // For reproducible results
  num_outputs: 4,           // Generate multiple variations
});
```

## Support

- **Atlas Cloud Docs**: https://www.atlascloud.ai/docs
- **API Reference**: https://www.atlascloud.ai/docs/openapi-index
- **Support**: Contact Atlas Cloud support for API issues

---

**Ready to generate amazing marketing images!** 🎨✨
