import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Page } from "playwright";
import { usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";

async function scrapeCitadelCareers() {
    console.log("Running Scraper 0010 - Citadel Careers");

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
    const page: Page = await browser.newPage();

    page.on('requestfinished', async(request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");

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
        console.log("\n Finished Running - Scraper 0010 - Citadel Careers");
    }
}

scrapeCitadelCareers();
