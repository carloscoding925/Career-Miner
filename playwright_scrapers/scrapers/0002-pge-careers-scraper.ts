import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";

async function scrapePgeCareers() {
    console.log("Running Scraper 0002 - PG&E Careers");

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
    const page: Page = await context.newPage();

    // Resource Blocking and Data Usage
    page.on('requestfinished', async (request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.PGE, {
            waitUntil: 'load'
        });

        await page.waitForTimeout(1000);
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        bandwidthTracker.printSummary();
        browser.close();
        console.log("\n Finished Running - Scraper 0002 - PG&E Careers");
    }
}

scrapePgeCareers();
