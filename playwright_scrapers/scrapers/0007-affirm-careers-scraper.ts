import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_ENGINEERING } from "../constants/search-terms.js";
import { FILTER_NEW_YORK_LONG, FILTER_REMOTE_US, FILTER_SAN_FRANCISCO } from "../constants/filters.js";
import { PostingCoverData } from "../models/data-storage.js";

async function scrapeSeatGeekCareers() {
    console.log("Running Scraper 0007 - Affirm Careers");

    // File Variables
    const __filename: string = fileURLToPath(import.meta.url);
    const __dirname: string = path.dirname(__filename);
    const scraperPrefix: string = getFilePrefix(__filename);

    // Init Bandwidth Tracking Util
    const bandwidthTracker: BandwidthTracker = new BandwidthTracker();

    // Launch Browser
    const browser: Browser = await chromium.launch({
        headless: process.env.HEADLESS === "true"
    });

    // Browser and Scraper Constants
    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    // Resource Blocking and Data Usage
    page.on('requestfinished', async (request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.AFFIRM, {
            waitUntil: 'load'
        });

        await page.waitForTimeout(3000);

        // Navigate to Openings Page and Filter Jobs
        await page.getByRole('link', { name: 'View openings' }).click();
        await page.waitForTimeout(1000);

        console.log(`Filtering by Department: ${SEARCH_ENGINEERING}`);
        await page.getByLabel('Department').selectOption(SEARCH_ENGINEERING);
        await page.waitForTimeout(1000);

        // Gather all Job Posting Data
        const jobCards: Locator[] = await page.locator('a[data-testid="jobCard"]').all();
        const officeLocations: string[] = [FILTER_REMOTE_US, FILTER_SAN_FRANCISCO, FILTER_NEW_YORK_LONG];
        const jobUrls: PostingCoverData[] = [];

        for (let i = 0; i < jobCards.length; i++) {
            const location: string | null = await jobCards[i].locator('.JobCard-office--tctKv').textContent();

            if (location && officeLocations.includes(location)) {
                const title: string = await jobCards[i].locator('.JobCard-title--4edEZ').textContent() ?? "";
                const url: string = await jobCards[i].getAttribute('href') ?? "";

                jobUrls.push({
                    title: title.trim(),
                    jobUrl: url.trim()
                });
            }
        }

        console.log(jobUrls);
        console.log(`Found ${jobUrls.length} jobs`);
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        bandwidthTracker.printSummary();

        await browser.close();
        console.log("\n Finished Running - Scraper 0007 - Affirm Careers");
    }
}

scrapeSeatGeekCareers();
