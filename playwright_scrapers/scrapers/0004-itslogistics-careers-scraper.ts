import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_TECH } from "../constants/search-terms.js";
import { FullJobDetails, PostingCoverData } from "../models/data-storage.js";

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
            const postedDaysText: string = await jobWrappers[i].locator('.Job-module-scss-module__MPRUTW__postedDays').textContent() ?? "";

            const daysAgoMatch: RegExpMatchArray | null = postedDaysText.match(/\d+/);
            const daysAgo: number = daysAgoMatch ? parseInt(daysAgoMatch[0]) : 0;

            const postDate: Date = new Date();
            postDate.setDate(postDate.getDate() - daysAgo);

            // Format as MM/DD/YYYY
            const month: string = String(postDate.getMonth() + 1).padStart(2, '0');
            const day: string = String(postDate.getDate()).padStart(2, '0');
            const year: number = postDate.getFullYear();
            const formattedDate: string = `${month}/${day}/${year}`;

            jobUrls.push({
                title: title.trim(),
                jobUrl: link.trim()
            });

            postedDates.push(formattedDate);
        }

        const jobListings: FullJobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < jobUrls.length; i++) {
            const job: PostingCoverData = jobUrls[i];
            console.log(`\nScraping Job ${i + 1}/${jobUrls.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load' });

                

                console.log(`✓ Successfully Scraped Job: ${job.title}`);
                successCount++;
            } catch (error) {
                console.error(`✗ Error scraping ${job.title}:`, error);
                errorCount++;
            }
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
