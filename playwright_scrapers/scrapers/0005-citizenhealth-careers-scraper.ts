import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, FrameLocator, Locator, Page } from "playwright";
import { usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_ENGINEERING } from "../constants/search-terms.js";
import { FullJobDetails, PostingCoverData } from "../models/data-storage.js";

async function scrapeCitizenHealthCareers() {
    console.log("Running Scraper 0005 - Citizen Health Careers");

    // File Variables
    const __filename: string = fileURLToPath(import.meta.url);
    const __dirname: string = path.dirname(__filename);
    const scraperPrefix: string = getFilePrefix(__filename);

    // Init bandwidth tracking util
    const bandwidthTracker: BandwidthTracker = new BandwidthTracker();

    // Launch Browser
    const browser: Browser = await chromium.launch({
        headless: false
    });

    // Browser and Scraper constants
    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    // Resource Blocking and Data Usage
    page.on('requestfinished', async(request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.CITIZEN_HEALTH, {
            waitUntil: "load"
        });

        console.log('Waiting for job board iframe to load...');

        // Scroll the iframe into view on the main page
        const iframeElement: Locator = page.locator('iframe[title*="Ashby"], iframe[src*="ashby"]');
        await iframeElement.waitFor({ state: 'visible', timeout: 10000 });
        await iframeElement.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        const iframe: FrameLocator = page.frameLocator('iframe[title*="Ashby"], iframe[src*="ashby"]');

        console.log(`Filtering Job Listings by Department: ${SEARCH_ENGINEERING}`);

        const departmentSelect = iframe.locator('select[name="departmentId"]');
        await departmentSelect.waitFor({ state: 'visible', timeout: 10000 });
        await departmentSelect.selectOption({ label: SEARCH_ENGINEERING });
        await page.waitForTimeout(1500);

        console.log('Successfully filtered jobs by department');

        // Extract job listings
        console.log('Extracting job listings...');

        const jobListingsContainer: Locator = iframe.locator('.ashby-job-posting-brief-list');
        await jobListingsContainer.waitFor({ state: 'visible', timeout: 3000 });

        const jobLinks: Locator = jobListingsContainer.locator('a');
        const jobCount: number = await jobLinks.count();
        console.log(`Found ${jobCount} job listings`);

        const jobUrls: PostingCoverData[] = [];

        for (let i = 0; i < jobCount; i++) {
            const link: Locator = jobLinks.nth(i);
            const title: string = await link.locator('.ashby-job-posting-brief-title').textContent() ?? "";
            const url: string = await link.getAttribute('href') ?? "";

            jobUrls.push({
                title: title?.trim(),
                jobUrl: `https://jobs.ashbyhq.com${url}`
            });
        }

        // Enter every job posting and extract data
        const jobListings: FullJobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < jobUrls.length; i++) {
            const job: PostingCoverData = jobUrls[i];
            console.log(`\nScraping Job ${i + 1}/${jobUrls.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load' });
                await page.waitForTimeout(1000);

                const jobIframe: FrameLocator = page.frameLocator('iframe[title*="Ashby"], iframe[src*="ashby"]');
                const leftPane: Locator = jobIframe.locator('._left_oj0x8_418.ashby-job-posting-left-pane');
                await leftPane.waitFor({ state: 'visible', timeout: 5000 });

                const locationSection = leftPane.locator('._section_101oc_37').filter({ hasText: 'Location' }).first();
                const location: string = await locationSection.locator('p').textContent() ?? "";

                const compensationSection = leftPane.locator('._section_101oc_37').filter({ hasText: 'Compensation' });
                let payRange: string = "";

                if (await compensationSection.count() > 0) {
                    payRange = await compensationSection.locator('p').textContent() ?? "";
                }

                console.log(`Location: ${location.trim()}`);
                console.log(`Pay Range: ${payRange.trim() || 'Not specified'}`);

                // Store the job details
                jobListings.push({
                    jobUrl: job.jobUrl,
                    jobTitle: job.title,
                    description: "", // To be extracted later
                    payRange: payRange.trim(),
                    location: location.trim(),
                    postingDate: "", // To be extracted later
                    jobId: "" // To be extracted later
                });

                console.log(`✓ Successfully Scraped Job: ${job.title}`);
                successCount++;
            } catch (error) {
                console.error(`✗ Error scraping ${job.title}:`, error);
                errorCount++;
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(50));
        console.log('SCRAPING SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total jobs found: ${jobUrls.length}`);
        console.log(`Successfully scraped: ${successCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log('='.repeat(50));
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        bandwidthTracker.printSummary();

        /*
        const outputDir: string = path.join(__dirname, usageOutputDirectory);
        deleteOldFiles(outputDir, scraperPrefix);
        writeNewFile(outputDir, scraperPrefix, bandwidthTracker.returnStats());
        */

        await browser.close();
        console.log("\n Finished Running - Scraper 0005 - Citizen Health Careers");
    }
}

scrapeCitizenHealthCareers();
