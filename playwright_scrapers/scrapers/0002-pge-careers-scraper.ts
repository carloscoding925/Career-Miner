import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_INFORMATION_TECHNOLOGY } from "../constants/search-terms.js";

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

        // Apply Filters
        console.log("Applying Filters");
        await page.evaluate(() => {
            const toggleButton: HTMLButtonElement = document.querySelector('#category-toggle') as HTMLButtonElement;
            if (toggleButton) {
                toggleButton.classList.add('expandable-child-open');
                toggleButton.setAttribute('aria-expanded', 'true');
            }

            const filterList: HTMLElement = document.querySelector('#category-toggle + .search-filter-list') as HTMLElement;
            if (filterList) {
                filterList.classList.add('expandable-childlist-open');
            }

            const checkbox: HTMLInputElement = document.querySelector('input[data-facet-type="1"][data-display="Information Technology"]') as HTMLInputElement;
            if (checkbox) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                checkbox.dispatchEvent(new Event('click', { bubbles: true }));
            }
        });
        await page.waitForTimeout(2000);

        
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        bandwidthTracker.printSummary();
        browser.close();
        console.log("\n Finished Running - Scraper 0002 - PG&E Careers");
    }
}

scrapePgeCareers();
