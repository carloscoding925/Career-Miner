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
    await page.fill('#keyword-input', 'Information Technology');

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

    // Scrape all job URLs from the results page
    console.log('Extracting job URLs...');
    const jobUrls = await page.$$eval('.job-result', (elements) => {
      return elements.map(el => {
        // Find the <a> tag inside the front-section
        const titleLink = el.querySelector('.front-section a');
        const title = titleLink?.textContent?.trim() || '';
        const jobUrl = titleLink?.getAttribute('href') || '';
        const jobId = el.querySelector('.title-section__id')?.textContent?.trim() || '';

        return {
          title,
          jobUrl,
          jobId,
        };
      });
    });

    console.log(`Found ${jobUrls.length} job listings`);

    // Now visit each job page and scrape detailed information
    const jobListings = [];
    for (let i = 0; i < jobUrls.length; i++) {
      const job = jobUrls[i];
      console.log(`\nScraping job ${i + 1}/${jobUrls.length}: ${job.title}`);

      try {
        // Navigate to the job detail page
        await page.goto(job.jobUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // Scrape detailed information from the job page
        const jobDetails = await page.evaluate(() => {
          // Customize these selectors based on what data you want from the job page
          // This is a template - you'll need to inspect the actual job page to find the right selectors

          const getTextContent = (selector: string) => {
            const element = document.querySelector(selector);
            return element?.textContent?.trim() || '';
          };

          return {
            // Job title from detail page
            jobTitle: getTextContent('h1.job-details__title'),
            // Job description
            description: getTextContent('.job-details__description-content'),
            // Add more fields as needed
            fullPageText: document.body.innerText, // Fallback: get all text
          };
        });

        // Combine listing info with detailed info
        jobListings.push({
          title: job.title,
          jobId: job.jobId,
          jobUrl: job.jobUrl,
          ...jobDetails,
        });

        console.log(`✓ Successfully scraped: ${job.title}`);

      } catch (error) {
        console.error(`✗ Error scraping ${job.title}:`, error);
        // Add the job with basic info even if scraping fails
        jobListings.push({
          title: job.title,
          jobId: job.jobId,
          jobUrl: job.jobUrl,
          error: 'Failed to scrape job details',
        });
      }
    }

    console.log(`\nSuccessfully scraped ${jobListings.length} jobs`);

    // Prepare scraped data
    const scrapedData = {
      scrapedAt: new Date().toISOString(),
      searchTerm: 'Information Technology',
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
