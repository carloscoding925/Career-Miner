import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, FrameLocator, Locator, Page } from "playwright";
import { usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_ENGINEERING } from "../constants/search-terms.js";

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

        // First, scroll the iframe itself into view on the main page
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
