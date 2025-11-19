# EaseMail Marketing Images

This directory contains AI-generated images created with OpenAI's DALL-E 3 for the marketing website.

## Generated Images

### 1. **hero-background.png** (1792x1024)
- **Usage**: Hero section background
- **Description**: Abstract gradient background with subtle email and AI elements
- **Location**: `HeroSection.tsx` - Background overlay

### 2. **mobile-desktop-mockup.png** (1792x1024)
- **Usage**: Hero section main image
- **Description**: Clean product shot of laptop and smartphone displaying email interface
- **Location**: `HeroSection.tsx` - Main hero image

### 3. **ai-assistant-feature.png** (1024x1024)
- **Usage**: Features showcase & How It Works
- **Description**: Modern 3D illustration of AI assistant helping with email composition
- **Location**: `FeaturesShowcase.tsx`, `HowItWorks.tsx`

### 4. **email-organization.png** (1024x1024)
- **Usage**: Features showcase & How It Works
- **Description**: Clean 3D illustration showing organized email inbox with smart categorization
- **Location**: `FeaturesShowcase.tsx`, `HowItWorks.tsx`

### 5. **threading-visualization.png** (1024x1024)
- **Usage**: Features showcase
- **Description**: Modern 3D visualization of connected email conversations and threads
- **Location**: `FeaturesShowcase.tsx`

### 6. **productivity-dashboard.png** (1024x1024)
- **Usage**: Features showcase & How It Works
- **Description**: Isometric 3D illustration of email productivity dashboard with charts
- **Location**: `FeaturesShowcase.tsx`, `HowItWorks.tsx`

### 7. **team-collaboration.png** (1792x1024)
- **Usage**: Features showcase
- **Description**: Professional diverse business team collaborating in modern office
- **Location**: `FeaturesShowcase.tsx`

### 8. **smart-compose.png** (1024x1024)
- **Usage**: Features showcase
- **Description**: 3D illustration of AI writing and composing email with magical effects
- **Location**: `FeaturesShowcase.tsx`

## Generation Details

- **Model**: DALL-E 3
- **Quality**: HD
- **Style**: Natural
- **Total Cost**: ~$0.64 (8 images × $0.08 each)
- **Generation Date**: November 19, 2025
- **Script**: `scripts/generate-marketing-images.ts`

## Regenerating Images

To regenerate or create new images:

```bash
npm run generate-images
```

**Note**: Make sure your `OPENAI_API_KEY` is set in `.env.local`

## Image Optimization

All images are PNG format. Consider optimizing for web:

1. Convert to WebP for better compression
2. Create responsive sizes (1x, 2x)
3. Lazy load below-the-fold images
4. Add proper alt text for accessibility

## Usage in Components

```tsx
// Hero Section
<img 
  src="/assets/marketing/mobile-desktop-mockup.png" 
  alt="EaseMail Dashboard"
/>

// Features
<img 
  src="/assets/marketing/ai-assistant-feature.png" 
  alt="AI Assistant Feature"
/>
```

## License

These images were generated specifically for EaseMail and are proprietary to the project.

