import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util";
import { BandwidthTracker } from "../utils/bandwidth-util";
import { Browser, BrowserContext, chromium, Page } from "playwright";
import { usageOutputDirectory } from "../constants/directories";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util";

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

    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        bandwidthTracker.printSummary();

        const outputDir: string = path.join(__dirname, usageOutputDirectory);
        deleteOldFiles(outputDir, scraperPrefix);
        writeNewFile(outputDir, scraperPrefix, bandwidthTracker.returnStats());

        await browser.close();
        console.log("\n Finished Running - Scraper 0005 - Citizen Health Careers");
    }
}

scrapeCitizenHealthCareers();
