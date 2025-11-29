import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_JANE_STREET, SEARCH_TECHNOLOGY } from "../constants/search-terms.js";
import { FILTER_NEW_YORK } from "../constants/filters.js";
import { PostingCoverData } from "../models/data-storage.js";

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

        // Extract Job Listings from both Experienced and New Grad posting pages
        const jobUrls: PostingCoverData[] = [];

        // Scrape Experienced Candidates page
        console.log("\nScraping Experienced Candidates page...");
        await page.goto(experiencedFullUrl, { waitUntil: 'load' });
        await page.waitForTimeout(3000);

        console.log(`Filtering Experienced Job Listings by Roles: ${SEARCH_JANE_STREET} and ${SEARCH_TECHNOLOGY}`);
        console.log(`Filtering Job Listings by Location: ${FILTER_NEW_YORK}`);

        // Scroll to make dropdowns visible
        await page.locator('.dropdowns-list').first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);

        await page.selectOption('.location-select', FILTER_NEW_YORK);
        await page.selectOption('.department-select', SEARCH_JANE_STREET);
        await page.waitForTimeout(3000);

        // Extract all job postings
        const experiencedJobLinks: Locator[] = await page.locator('.jobs-container a').all();
        console.log(`\n Found ${experiencedJobLinks.length} jobs under the Experienced Category`);

        for (const link of experiencedJobLinks) {
            const href: string | null = await link.getAttribute('href');
            const titleElement: string | null = await link.locator('.item.experienced.position p').textContent();

            if (href && titleElement) {
                jobUrls.push({
                    title: titleElement.trim(),
                    jobUrl: baseUrl + href
                });
            }
        }

        // Scrape Students/New Grads page
        console.log("\nScraping Students/New Grads page...");
        await page.goto(newGradFullUrl, { waitUntil: 'load' });
        await page.waitForTimeout(3000);

        console.log(`Filtering New Grad Job Listings by Roles: ${SEARCH_JANE_STREET} and ${SEARCH_TECHNOLOGY}`);
        console.log(`Filtering Job Listings by Location: ${FILTER_NEW_YORK}`);

        // Scroll the page to make dropdowns visible
        // Note: There are multiple select elements on the page, we use .last() to target the visible one
        await page.evaluate(() => {
            window.scrollTo(0, 400);
        });
        await page.waitForTimeout(1500);

        // Use .last() to get the visible select element
        await page.locator('.location-select').last().selectOption(FILTER_NEW_YORK);
        await page.locator('.department-select').last().selectOption(SEARCH_JANE_STREET);
        await page.waitForTimeout(3000);

        // Extract all job postings
        const newGradJobLinks: Locator[] = await page.locator('.jobs-container a').all();
        console.log(`Found ${newGradJobLinks.length} jobs under the New Grad Category`);

        for (const link of newGradJobLinks) {
            const href: string | null = await link.getAttribute('href');
            const titleElement: string | null = await link.locator('.item.students-and-new-grads.position p').textContent();

            if (href && titleElement) {
                jobUrls.push({
                    title: titleElement.trim(),
                    jobUrl: baseUrl + href
                });
            }
        }

        console.log(`Found ${jobUrls.length} jobs`);
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
