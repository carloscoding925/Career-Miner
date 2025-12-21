import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_INFORMATION_TECHNOLOGY } from "../constants/search-terms.js";
import { PostingCoverData } from "../models/data-storage.js";

async function scrapeSouthernEdisonCareers() {
    console.log("Running Scraper 0003 - Southern California Edison Careers");

    // File Variables
    const __filename: string = fileURLToPath(import.meta.url);
    const __dirname: string = path.dirname(__filename);
    const scraperPrefix: string = getFilePrefix(__filename);

    // Init Bandwidth Tracker
    const bandwidthTracker: BandwidthTracker = new BandwidthTracker();

    // Launch Browser
    const browser: Browser = await chromium.launch({
        headless: process.env.HEADLESS === "true"
    });

    // Browser and Scraper Constants
    const context: BrowserContext = await browser.newContext();
    const page: Page = await browser.newPage();

    // Resource Blocking and Data Usage
    page.on('requestfinished', async (request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.SCE, {
            waitUntil: "load"
        });
        await page.waitForTimeout(3000);

        await page.getByRole('button', { name: 'Search' }).last().click();
        await page.waitForTimeout(1000);

        // Filter Jobs
        console.log(`Filtering Jobs by Category: ${SEARCH_INFORMATION_TECHNOLOGY}`);
        await page.selectOption('#cws_jobsearch_primary_category', SEARCH_INFORMATION_TECHNOLOGY);
        await page.waitForTimeout(1000);

        const jobUrls: PostingCoverData[] = [];
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        bandwidthTracker.printSummary();

        await browser.close();
        console.log("\n Finished Running - Scraper 0003 - SCE Careers");
    }
}

scrapeSouthernEdisonCareers();
