import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for web scraping
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  use: {
    // Browser context options
    headless: true, // Set to true to run without opening browser window
    viewport: { width: 1920, height: 1080 },

    // Navigation timeout (30 seconds)
    navigationTimeout: 30000,

    // Action timeout (10 seconds)
    actionTimeout: 10000,

    // User agent (optional - uncomment to use custom user agent)
    // userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },

  // Use only Chromium for scraping (fastest and most reliable)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
