require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const https = require('https');

const ATLASCLOUD_API_KEY = process.env.ATLASCLOUD_API_KEY;
const BASE_URL = 'https://api.atlascloud.ai/api/v1';
const OUTPUT_DIR = path.join(__dirname, 'public', 'assets', 'marketing');

// Natural, photorealistic prompts that look like real corporate photography
const images = [
  {
    filename: 'hero-background.png',
    prompt: 'Professional business person working on modern laptop in bright contemporary office, natural window lighting, clean minimalist desk setup, real corporate environment, shot on Canon EOS R5, shallow depth of field, professional photography, authentic workspace, photorealistic, 8k, corporate lifestyle photography',
    width: 1920,
    height: 1080,
  },
  {
    filename: 'email-organization.png',
    prompt: 'Professional workspace with laptop showing email interface, modern office desk with coffee cup and notepad, natural daylight from window, real corporate setting, authentic business environment, shot on Sony A7III, professional corporate photography, warm natural tones, photorealistic, high quality business photography',
    width: 1920,
    height: 1080,
  },
  {
    filename: 'ai-assistant-feature.png',
    prompt: 'Close-up of business professional typing on laptop keyboard, hands visible on keyboard, modern corporate office background softly blurred, natural office lighting, authentic work environment, shot on Nikon Z7, professional business photography, shallow depth of field, photorealistic, corporate lifestyle',
    width: 1920,
    height: 1080,
  },
  {
    filename: 'smart-compose.png',
    prompt: 'Professional using laptop at modern standing desk in bright office, side view, natural posture, real workspace with plants and natural light, contemporary corporate interior, shot on Canon 5D Mark IV, professional lifestyle photography, authentic business setting, warm natural lighting, photorealistic',
    width: 1920,
    height: 1080,
  },
  {
    filename: 'threading-visualization.png',
    prompt: 'Business person reviewing emails on modern laptop screen, focused expression, contemporary office environment, natural window light, real corporate workspace, professional attire, shot on Sony A7R IV, authentic business photography, shallow depth of field, photorealistic, corporate lifestyle',
    width: 1920,
    height: 1080,
  },
  {
    filename: 'productivity-dashboard.png',
    prompt: 'Wide angle view of modern corporate office workspace, professional at laptop with dual monitors, bright natural lighting from large windows, real business environment, contemporary interior design, plants and minimal decor, shot on Canon EOS R6, professional architectural photography, photorealistic, 8k',
    width: 1920,
    height: 1080,
  },
  {
    filename: 'team-collaboration.png',
    prompt: 'Small group of diverse professionals collaborating around laptop in modern conference room, natural interaction, genuine smiles, contemporary corporate office, large windows with natural light, real business meeting, shot on Sony A7IV, professional corporate photography, authentic team environment, photorealistic',
    width: 1920,
    height: 1080,
  },
  {
    filename: 'mobile-desktop-mockup.png',
    prompt: 'Modern laptop and smartphone on clean white desk, minimal setup, soft natural lighting from side, professional product photography style, real devices, contemporary workspace aesthetic, shot on Canon EOS R5 with macro lens, shallow depth of field, photorealistic, high-end product photography',
    width: 1920,
    height: 1080,
  },
];

async function generateImage(imageConfig) {
  console.log(`\n📸 Generating: ${imageConfig.filename}`);
  console.log(`📝 Prompt: ${imageConfig.prompt.substring(0, 100)}...`);

  try {
    // Step 1: Request image generation
    const response = await fetch(`${BASE_URL}/model/generateImage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ATLASCLOUD_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'black-forest-labs/flux-dev', // High quality model
        prompt: imageConfig.prompt,
        width: imageConfig.width,
        height: imageConfig.height,
        guidance_scale: 7.5,
        num_inference_steps: 30,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Atlas Cloud returns data in data.data object
    const requestData = data.data;
    console.log(`⏳ Request ID: ${requestData.id}`);
    console.log(`⏳ Status: ${requestData.status}`);

    // Step 2: Poll for results if needed
    let imageUrl;
    if (requestData.status === 'pending' || requestData.status === 'processing') {
      console.log('⏳ Waiting for image generation...');
      imageUrl = await pollForResult(requestData.id);
    } else if (requestData.status === 'completed' && requestData.outputs && requestData.outputs.length > 0) {
      imageUrl = requestData.outputs[0];
    }

    if (!imageUrl) {
      throw new Error(`No image URL in response. Status: ${requestData.status}, Outputs: ${JSON.stringify(requestData.outputs)}`);
    }

    console.log(`✅ Generated: ${imageUrl}`);

    // Step 3: Download and save image
    await downloadImage(imageUrl, path.join(OUTPUT_DIR, imageConfig.filename));
    console.log(`💾 Saved to: ${imageConfig.filename}`);

    return { success: true, filename: imageConfig.filename };
  } catch (error) {
    console.error(`❌ Failed to generate ${imageConfig.filename}:`, error.message);
    return { success: false, filename: imageConfig.filename, error: error.message };
  }
}

async function pollForResult(requestId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    try {
      const pollResponse = await fetch(`${BASE_URL}/model/prediction/${requestId}`, {
        headers: {
          Authorization: `Bearer ${ATLASCLOUD_API_KEY}`,
        },
      });

      if (!pollResponse.ok) {
        throw new Error(`Polling failed: ${pollResponse.status}`);
      }

      const pollData = await pollResponse.json();
      const requestData = pollData.data;

      if (i % 3 === 0) {
        console.log(`   Status: ${requestData.status} (attempt ${i + 1}/${maxAttempts})`);
      }

      if (requestData.status === 'completed' || requestData.status === 'succeeded') {
        if (requestData.outputs && requestData.outputs.length > 0) {
          return requestData.outputs[0];
        }
        throw new Error('Generation completed but no outputs found');
      }

      if (requestData.status === 'failed' || requestData.status === 'error') {
        throw new Error(`Generation failed: ${requestData.error || 'Unknown error'}`);
      }
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
    }
  }

  throw new Error('Generation timed out after 5 minutes');
}

async function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('\n🎨 EaseMail Marketing Image Generator');
  console.log('=====================================\n');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`📸 Generating ${images.length} images with photorealistic prompts`);
  console.log(`🤖 Using Flux Dev (high quality model)\n`);

  if (!ATLASCLOUD_API_KEY) {
    console.error('❌ ATLASCLOUD_API_KEY not found in .env.local');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate images sequentially to avoid rate limiting
  const results = [];
  for (const imageConfig of images) {
    const result = await generateImage(imageConfig);
    results.push(result);

    // Wait a bit between requests
    if (results.length < images.length) {
      console.log('\n⏸️  Waiting 5 seconds before next generation...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Summary
  console.log('\n\n📊 GENERATION SUMMARY');
  console.log('=====================\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${images.length}`);
  successful.forEach(r => console.log(`   ✓ ${r.filename}`));

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${images.length}`);
    failed.forEach(r => console.log(`   ✗ ${r.filename}: ${r.error}`));
  }

  console.log('\n✨ Done! Your new marketing images are ready.\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
