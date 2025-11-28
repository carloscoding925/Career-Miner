import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Page } from "playwright";
import { usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util";
import { CompanyUrls } from "../models/companies.js";

async function scrapeJaneStreetCareers() {
    console.log("Running Scraper 0009 - Jane Street Careers");

    // File Variables
    const __filename: string = fileURLToPath(import.meta.url);
    const __dirname: string = path.dirname(__filename);
    const scraperPrefix: string = getFilePrefix(__filename);

    // Init bandwidth tracking util
    const bandwidthTracker: BandwidthTracker = new BandwidthTracker();

    // Launch Browser
    const browser: Browser = await chromium.launch({
        headless: process.env.HEADLESS === 'true'
    });

    // Browser and Scraper constants
    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    page.on('requestfinished', async (request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.JANE_STREET, {
            waitUntil: 'load'
        });

        await page.waitForTimeout(3000);

        // Extract URLs for both career pages
        console.log("Extracting career page URLs");

        // Scroll to make the buttons visible
        await page.locator('.open-roles-cards-container').scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);

        const experiencedUrl: string = await page.locator('.open-roles-card-experienced').getAttribute('href') ?? "";
        const newGradUrl: string = await page.locator('.open-roles-card-students').getAttribute('href') ?? "";

        if (experiencedUrl === "" || newGradUrl === "") {
            throw new Error("Failed to extract career page URLs");
        }

        const baseUrl: string = 'https://www.janestreet.com';
        const experiencedFullUrl: string = baseUrl + experiencedUrl;
        const newGradFullUrl: string = baseUrl + newGradUrl;

        // Scrape Experienced Candidates page
        console.log("\nScraping Experienced Candidates page...");
        await page.goto(experiencedFullUrl, { waitUntil: 'load' });
        await page.waitForTimeout(2000);
        // TODO: Add scraping logic for experienced candidates

        // Scrape Students/New Grads page
        console.log("\nScraping Students/New Grads page...");
        await page.goto(newGradFullUrl, { waitUntil: 'load' });
        await page.waitForTimeout(2000);
        // TODO: Add scraping logic for students/new grads

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
        console.log("\n Finished Running - Scraper 0009 - Jane Street Careers");
    }
}

scrapeJaneStreetCareers();
