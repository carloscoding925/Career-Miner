import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_TECH } from "../constants/search-terms.js";
import { PostingCoverData } from "../models/data-storage.js";

async function scrapeCreditOneCareers() {
    console.log("Running Scraper 0004 - ITS Logistics Careers");

    // File Variables
    const __filename: string = fileURLToPath(import.meta.url);
    const __dirname: string = path.dirname(__filename);
    const scraperPrefix: string = getFilePrefix(__filename);

    // Init bandwidth tracking util
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
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.ITS, {
            waitUntil: 'load'
        });

        await page.waitForTimeout(3000);

        // Filter jobs by Department
        console.log(`Filtering Jobs by Department: ${SEARCH_TECH}`);
        await page.locator('#react-select-department-type-filter-input').click();
        await page.getByRole('option', { name: SEARCH_TECH }).click();

        // Extract Job URLS, titles, and days since posted
        const jobWrappers: Locator[] = await page.locator('.Job-module-scss-module__MPRUTW__wrapper').all();
        const jobUrls: PostingCoverData[] = [];
        const postedDates: string[] = [];

        for (let i = 0; i < jobWrappers.length; i++) {
            const title: string = await jobWrappers[i].locator('.Job-module-scss-module__MPRUTW__name').textContent() ?? "";
            const link: string = await jobWrappers[i].locator('a.Button-module-scss-module__Ib45na__button').getAttribute('href') ?? "";
            const postedDays = await jobWrappers[i].locator('.Job-module-scss-module__MPRUTW__postedDays').textContent() ?? "";

            jobUrls.push({
                title: title.trim(),
                jobUrl: link.trim()
            });

            postedDates.push(postedDays.trim());
        }
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        bandwidthTracker.printSummary();

        await browser.close();
        console.log("\n Finished Running - Scraper 0004 - ITS Logistics Careers");
    }
}

scrapeCreditOneCareers();
