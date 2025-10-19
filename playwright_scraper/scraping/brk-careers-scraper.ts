import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function scrapeBRKCareers() {
  console.log('Starting BRK Energy careers scraper...');

  // Launch browser
  const browser = await chromium.launch({
    headless: false, // Set to true to run in background
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to careers page
    console.log('Navigating to careers page...');
    await page.goto('https://careers.brkenergy.com/home', {
      waitUntil: 'networkidle', // Wait until network is idle
    });

    // Wait a moment for dynamic content to load
    await page.waitForTimeout(2000);

    // TODO: Inspect the page and add your selectors here
    // Example: Extract job listings
    // const jobListings = await page.$$eval('.job-card', (elements) => {
    //   return elements.map(el => ({
    //     title: el.querySelector('.job-title')?.textContent?.trim(),
    //     location: el.querySelector('.job-location')?.textContent?.trim(),
    //     department: el.querySelector('.job-department')?.textContent?.trim(),
    //   }));
    // });

    // For now, let's just get the page title to verify it works
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);

    // Example: Get all text content from the page
    const pageContent = await page.textContent('body');
    console.log('Page loaded successfully!');
    console.log('First 200 characters:', pageContent?.substring(0, 200));

    // TODO: Replace with actual scraped data
    const scrapedData = {
      scrapedAt: new Date().toISOString(),
      pageTitle: pageTitle,
      // Add your extracted data here
    };

    // Save data to file
    const outputDir = path.join(__dirname, '../data_output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const outputFile = path.join(outputDir, `brk-careers-${timestamp}.json`);

    fs.writeFileSync(outputFile, JSON.stringify(scrapedData, null, 2));
    console.log(`Data saved to: ${outputFile}`);

  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    // Close browser
    await browser.close();
    console.log('Scraper finished!');
  }
}

// Run the scraper
scrapeBRKCareers();
