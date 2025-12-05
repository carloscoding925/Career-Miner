import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_SOFTWARE } from "../constants/search-terms.js";
import { PostingCoverData } from "../models/data-storage.js";

async function scrapeTwitchCareers() {
    console.log("Running Scraper 0008 - Twitch Careers");

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

    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    page.on('requestfinished', async (request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.TWITCH, {
            waitUntil: 'load'
        });

        await page.waitForTimeout(3000);

        // Extract Job Title and Posting URLS
        console.log("Extracting Posting URL's");
        await page.getByRole('link', { name: 'Job Openings' }).click();
        await page.waitForTimeout(2000);

        const searchBox: Locator = page.getByRole('textbox');
        await searchBox.waitFor({ state: 'visible' });
        await searchBox.fill(SEARCH_SOFTWARE);
        await page.waitForTimeout(2000);

        await page.waitForSelector('.mb-14 .border-b a.text-twitch-purple');
        const jobs: PostingCoverData[] = await page.locator('.mb-14 .border-b a.text-twitch-purple').evaluateAll((links) => {
            return links.map(link => ({
                title: link.textContent?.trim() || '',
                jobUrl: link.getAttribute('href') || ''
            }));
        });

        const jobUrls: PostingCoverData[] = jobs.map(job => ({
            title: job.title,
            jobUrl: CompanyUrls.TWITCH + job.jobUrl
        }));
        console.log(`Found ${jobUrls.length} Job Postings`);
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
        console.log("\n Finished Running - Scraper 0008 - Twitch Careers");
    }
}

scrapeTwitchCareers();
