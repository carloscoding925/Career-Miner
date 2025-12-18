import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";

async function scrapeSeatGeekCareers() {
    console.log("Running Scraper 0007 - SeatGeek Careers");

    const __filename: string = fileURLToPath(import.meta.url);
    const __dirname: string = path.dirname(__filename);
    const scraperPrefix: string = getFilePrefix(__filename);

    const bandwidthTracker: BandwidthTracker = new BandwidthTracker();

    const browser: Browser = await chromium.launch({
        headless: process.env.HEADLESS === "true"
    });

    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    page.on('requestfinished', async (request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.SEAT_GEEK, {
            waitUntil: 'load'
        });

        await page.waitForTimeout(3000);
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        await browser.close();
    }
}

scrapeSeatGeekCareers();
