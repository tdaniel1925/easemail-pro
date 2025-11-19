import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ImagePrompt {
  name: string;
  prompt: string;
  size: '1024x1024' | '1792x1024' | '1024x1792';
}

const marketingImages: ImagePrompt[] = [
  {
    name: 'hero-background',
    prompt: 'Abstract gradient background with subtle email and AI elements, modern professional design, soft blues and purples, minimalist, clean, high quality for website hero section',
    size: '1792x1024',
  },
  {
    name: 'ai-assistant-feature',
    prompt: 'Modern 3D illustration of an AI assistant helping with email composition, floating holographic interface, professional color scheme with blues and whites, clean minimalist style, high quality',
    size: '1024x1024',
  },
  {
    name: 'email-organization',
    prompt: 'Clean 3D illustration showing organized email inbox with smart categorization, folders, and labels, modern SaaS style, professional blues and purples, minimalist design',
    size: '1024x1024',
  },
  {
    name: 'threading-visualization',
    prompt: 'Modern 3D visualization of connected email conversations and threads, flowing connections between message bubbles, professional tech aesthetic, blue gradient, clean design',
    size: '1024x1024',
  },
  {
    name: 'productivity-dashboard',
    prompt: 'Isometric 3D illustration of email productivity dashboard with charts and analytics, modern SaaS interface style, professional color palette, clean and organized',
    size: '1024x1024',
  },
  {
    name: 'team-collaboration',
    prompt: 'Professional diverse business team collaborating in modern office, looking at laptop showing email interface, natural lighting, realistic photography style, business casual attire',
    size: '1792x1024',
  },
  {
    name: 'mobile-desktop-mockup',
    prompt: 'Clean product shot of laptop and smartphone displaying modern email interface side by side, professional workspace background, soft shadows, high quality product photography',
    size: '1792x1024',
  },
  {
    name: 'smart-compose',
    prompt: '3D illustration of AI writing and composing email with magical sparkles effect, floating keyboard and text, modern tech aesthetic, blue and purple gradient, professional design',
    size: '1024x1024',
  },
];

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      fileStream.on('error', reject);
    });
  });
}

async function generateMarketingImages() {
  console.log('🎨 Starting DALL-E 3 image generation...\n');

  // Create output directory
  const outputDir = path.join(process.cwd(), 'public', 'assets', 'marketing');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;
  const results: { name: string; status: string; path?: string; error?: string }[] = [];

  for (const imageConfig of marketingImages) {
    try {
      console.log(`📸 Generating: ${imageConfig.name}`);
      console.log(`   Prompt: ${imageConfig.prompt.substring(0, 80)}...`);

      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: imageConfig.prompt,
        n: 1,
        size: imageConfig.size,
        quality: 'hd', // Use 'hd' for higher quality
        style: 'natural', // or 'vivid' for more dramatic
      });

      if (!response.data || !response.data[0] || !response.data[0].url) {
        throw new Error('No image URL returned');
      }

      const imageUrl = response.data[0].url;

      console.log(`   Revised prompt: ${response.data[0].revised_prompt?.substring(0, 60)}...`);

      // Download image
      const filename = `${imageConfig.name}.png`;
      const filepath = path.join(outputDir, filename);
      await downloadImage(imageUrl, filepath);

      console.log(`   ✅ Saved: ${filename}\n`);
      successCount++;
      results.push({
        name: imageConfig.name,
        status: 'success',
        path: `/assets/marketing/${filename}`,
      });

      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.error(`   ❌ Failed: ${imageConfig.name}`);
      console.error(`   Error: ${error.message}\n`);
      failCount++;
      results.push({
        name: imageConfig.name,
        status: 'failed',
        error: error.message,
      });
    }
  }

  console.log('\n=================================');
  console.log('📊 Generation Summary');
  console.log('=================================');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Images saved to: ${outputDir}`);
  console.log('\n📋 Results:');
  results.forEach(result => {
    if (result.status === 'success') {
      console.log(`  ✅ ${result.name} → ${result.path}`);
    } else {
      console.log(`  ❌ ${result.name} → ${result.error}`);
    }
  });
  console.log('=================================');

  // Save results to JSON for reference
  const resultsPath = path.join(outputDir, 'generation-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultsPath}`);
}

// Run the script
generateMarketingImages().catch(console.error);

