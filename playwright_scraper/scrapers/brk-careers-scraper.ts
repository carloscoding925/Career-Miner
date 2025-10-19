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

    // Enter search term in the keyword input
    console.log('Entering search term...');
    await page.fill('#keyword-input', 'Technology');

    // Submit the search (press Enter or click submit button)
    // Option 1: Press Enter key
    await page.press('#keyword-input', 'Enter');

    // Option 2: If there's a submit button, click it instead:
    // await page.click('button[type="submit"]'); // Adjust selector as needed

    // Wait for navigation to complete after search submission
    await page.waitForLoadState('networkidle');
    console.log('Search submitted, waiting for results...');

    // Wait a moment for search results to load
    await page.waitForTimeout(2000);

    // Get the new page title to verify we're on the results page
    const pageTitle = await page.title();
    console.log('Results page title:', pageTitle);

    // Scroll down the page to load all lazy-loaded job postings
    console.log('Scrolling to load all job postings...');
    let previousJobCount = 0;
    let currentJobCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;

    do {
      previousJobCount = currentJobCount;

      // Scroll to the bottom of the page
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for new content to load
      await page.waitForTimeout(1000);

      // Count current job postings
      currentJobCount = await page.$$eval('.job-result', elements => elements.length);
      console.log(`Current job count: ${currentJobCount}`);

      scrollAttempts++;
    } while (currentJobCount > previousJobCount && scrollAttempts < maxScrollAttempts);

    console.log(`Finished scrolling. Total jobs visible: ${currentJobCount}`);

    // Scrape all job listings from the results page
    console.log('Extracting job listings...');
    const jobListings = await page.$$eval('.job-result', (elements) => {
      return elements.map(el => {
        // Find the <a> tag inside the front-section
        const titleLink = el.querySelector('.front-section a');
        const title = titleLink?.textContent?.trim() || '';
        const jobUrl = titleLink?.getAttribute('href') || '';

        // Extract other useful information
        const jobId = el.querySelector('.title-section__id')?.textContent?.trim() || '';
        const location = el.querySelector('.tail__location')?.textContent?.replace('Location', '').trim() || '';
        const postedDate = el.querySelector('.tail__date')?.textContent?.replace('Posted Date', '').trim() || '';

        return {
          title,
          jobUrl,
          jobId,
          location,
          postedDate,
        };
      });
    });

    console.log(`Found ${jobListings.length} job listings`);
    jobListings.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title}`);
    });

    // Example: Get all text content from the page
    const pageContent = await page.textContent('body');
    console.log('Page loaded successfully!');
    console.log('First 200 characters:', pageContent?.substring(0, 200));

    // Prepare scraped data
    const scrapedData = {
      scrapedAt: new Date().toISOString(),
      searchTerm: 'Technology',
      totalJobs: jobListings.length,
      jobs: jobListings,
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
