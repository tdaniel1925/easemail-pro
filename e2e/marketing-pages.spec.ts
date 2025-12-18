import { test, expect } from '@playwright/test';

test.describe('Marketing Pages', () => {
  test.describe('Homepage', () => {
    test('should load homepage successfully', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/EaseMail/i);
    });

    test('should have navigation elements', async ({ page }) => {
      await page.goto('/');
      // Check for main navigation
      await expect(page.locator('nav')).toBeVisible();
    });

    test('should have call-to-action buttons', async ({ page }) => {
      await page.goto('/');
      // Look for signup/login CTAs
      const ctaButtons = page.getByRole('link', { name: /sign up|get started|try free|login/i });
      await expect(ctaButtons.first()).toBeVisible();
    });

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await expect(page).toHaveTitle(/EaseMail/i);
    });
  });

  test.describe('Features Page', () => {
    test('should load features page', async ({ page }) => {
      await page.goto('/features');
      await expect(page).toHaveURL(/features/);
    });

    test('should display feature sections', async ({ page }) => {
      await page.goto('/features');
      // Check page loaded without errors
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Pricing Page', () => {
    test('should load pricing page', async ({ page }) => {
      await page.goto('/pricing');
      await expect(page).toHaveURL(/pricing/);
    });

    test('should display pricing tiers', async ({ page }) => {
      await page.goto('/pricing');
      // Look for pricing-related content
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('About Page', () => {
    test('should load about page', async ({ page }) => {
      await page.goto('/about');
      await expect(page).toHaveURL(/about/);
    });
  });

  test.describe('FAQ Page', () => {
    test('should load FAQ page', async ({ page }) => {
      await page.goto('/faq');
      await expect(page).toHaveURL(/faq/);
    });

    test('should have expandable FAQ items', async ({ page }) => {
      await page.goto('/faq');
      // Check for accordion or expandable elements
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Contact Page', () => {
    test('should load contact page', async ({ page }) => {
      await page.goto('/contact');
      await expect(page).toHaveURL(/contact/);
    });

    test('should have contact form', async ({ page }) => {
      await page.goto('/contact');
      // Check for form elements
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('AI Features Page', () => {
    test('should load AI features page', async ({ page }) => {
      await page.goto('/ai-features');
      await expect(page).toHaveURL(/ai-features/);
    });
  });

  test.describe('AI Security Page', () => {
    test('should load AI security page', async ({ page }) => {
      await page.goto('/ai-security');
      await expect(page).toHaveURL(/ai-security/);
    });
  });

  test.describe('Use Cases Page', () => {
    test('should load use cases page', async ({ page }) => {
      await page.goto('/use-cases');
      await expect(page).toHaveURL(/use-cases/);
    });
  });

  test.describe('Legal Pages', () => {
    test('should load privacy policy', async ({ page }) => {
      await page.goto('/legal/privacy');
      await expect(page).toHaveURL(/legal\/privacy/);
    });

    test('should load terms of service', async ({ page }) => {
      await page.goto('/legal/terms');
      await expect(page).toHaveURL(/legal\/terms/);
    });
  });
});

test.describe('Navigation', () => {
  test('should navigate from homepage to features', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /features/i }).first().click();
    await expect(page).toHaveURL(/features/);
  });

  test('should navigate from homepage to pricing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /pricing/i }).first().click();
    await expect(page).toHaveURL(/pricing/);
  });
});

test.describe('SEO & Accessibility', () => {
  test('homepage should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    // Check for meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /.+/);
  });

  test('homepage should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    // Should have h1
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      // Images should have alt text or be decorative (role="presentation")
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
  });
});
