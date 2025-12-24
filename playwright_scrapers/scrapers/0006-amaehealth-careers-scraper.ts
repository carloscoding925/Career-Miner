import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_TECHNOLOGY } from "../constants/search-terms.js";
import { PostingCoverData } from "../models/data-storage.js";

async function scrapeAmaeHealthCareers() {
    console.log("Running Scraper 0006 - Amae Health Careers");

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

    // Resource Blocking
    page.on('requestfinished', async (request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Job Board");
        await page.goto(CompanyUrls.AMAE_HEALTH, {
            waitUntil: 'load'
        });
        
        await page.waitForTimeout(3000);

        // Grab Job URLS and Titles
        const technologySection: Locator = page.locator('.job-posts--table--department', {
            has: page.locator(`h3.section-header:text("${SEARCH_TECHNOLOGY}")`)
        });
        const jobPosts: Locator = technologySection.locator('tr.job-post');
        const jobCount: number = await jobPosts.count();
        
        const jobUrls: PostingCoverData[] = [];
        for (let i = 0; i < jobCount; i++) {
            const jobLink: Locator = jobPosts.nth(i).locator('a');
            const url: string = await jobLink.getAttribute('href') ?? "";
            const title: string = await jobLink.locator('p.body--medium').textContent() ?? "";

            jobUrls.push({
                title: title.trim(),
                jobUrl: url.trim()
            });
        }

        console.log(jobUrls);
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        bandwidthTracker.printSummary();

        await browser.close();
        console.log("\n Finished Running - Scraper 0006 - Amae Health Careers");
    }
}

scrapeAmaeHealthCareers();
