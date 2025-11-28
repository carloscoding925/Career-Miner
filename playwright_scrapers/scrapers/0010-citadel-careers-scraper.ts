import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_ENGINEERING, SEARCH_QUANTITATIVE_RESEARCH } from "../constants/search-terms.js";
import { FILTER_AMERICAS } from "../constants/filters.js";
import { FullJobDetails, PostingCoverData } from "../models/data-storage.js";
import { validateJobDetails } from "../utils/data-util.js";

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

    page.on('requestfinished', async (request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.CITADEL, {
            waitUntil: 'load'
        });

        await page.waitForTimeout(3000);

        const button: Locator = page.locator('a.button[href="/careers/open-opportunities/"]').first();
        await button.waitFor({ state: 'visible', timeout: 5000 });
        await button.click();
        await page.waitForLoadState('load');

        await page.waitForTimeout(3000);

        // Filter Jobs
        console.log(`Filtering Job Listings by Roles: ${SEARCH_QUANTITATIVE_RESEARCH} and ${SEARCH_ENGINEERING}`);
        console.log(`Filtering Job Listings by Location: ${FILTER_AMERICAS}`);
        await page.locator(`input[value="${SEARCH_ENGINEERING.toLowerCase()}"]`).check();
        await page.locator(`input[value="${SEARCH_QUANTITATIVE_RESEARCH.toLowerCase()}"]`).check();
        await page.locator(`input[value="${FILTER_AMERICAS.toLowerCase()}"]`).check();

        await page.waitForTimeout(3000);

        // Extract Job Listings from all pages
        console.log("Extracting Job Listings");
        const jobUrls: PostingCoverData[] = [];
        let currentPage: number = 1;

        while (true) {
            console.log(`\nProcessing page ${currentPage}...`);

            const jobCards: Locator = page.locator('a.careers-listing-card');
            const jobCount: number = await jobCards.count();
            console.log(`Found ${jobCount} job listings on page ${currentPage}`);

            for (let i = 0; i < jobCount; i++) {
                const card: Locator = jobCards.nth(i);
                const title: string = await card.locator('.careers-listing-card__title h2').textContent() ?? "";
                const url: string = await card.getAttribute('href') ?? "";

                jobUrls.push({
                    title: title.trim(),
                    jobUrl: url
                });
            }

            const nextButton: Locator = page.locator('div.is-desktop span.btn-next');
            const nextButtonExists: boolean = await nextButton.count() > 0;

            if (!nextButtonExists) {
                console.log("\nReached last page - no more results");
                break;
            }

            console.log("Navigating to next page...");
            const nextLink: Locator = page.locator('div.is-desktop a.next.page-numbers');
            await nextLink.click();
            await page.waitForLoadState('load');
            await page.waitForTimeout(2000);

            currentPage++;
        }
        console.log(`\nTotal job listings extracted: ${jobUrls.length}`);

        // Extract rest of available data from job listings
        const jobListings: FullJobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < jobUrls.length; i++) {
            const job: PostingCoverData = jobUrls[i];
            console.log(`\nScraping Job ${i + 1}/${jobUrls.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load' });
                await page.waitForTimeout(1000);

                const locationElement: Locator = page.locator('.single-job-application__title-inner p');
                const location: string = await locationElement.textContent() ?? "";

                const salaryElement: Locator = page.locator('div.text i:has-text("In accordance with applicable law")');
                const salary: string = await salaryElement.first().textContent() ?? "";

                const textContainer: Locator = page.locator('div.text');
                const fullText: string = await textContainer.innerHTML() ?? "";
                const jobDescMatch: RegExpMatchArray | null = fullText.match(/<h2[^>]*>.*?Job Description.*?<\/h2>(.*?)<h2[^>]*>.*?About Citadel.*?<\/h2>/s);
                const description: string = jobDescMatch ? jobDescMatch[1].trim() : "";

                const jobDetails: FullJobDetails = {
                    jobUrl: job.jobUrl,
                    jobTitle: job.title,
                    description: description,
                    payRange: salary,
                    location: location,
                    postingDate: "N/A",
                    jobId: "N/A"
                }
                const isValid: boolean = validateJobDetails(jobDetails);

                if (!isValid) {
                    console.log(`⚠ Invalid data for job: ${i + 1}/${jobUrls.length} - ${job.title}, skipping`);
                    errorCount++;
                    continue;
                }

                jobListings.push(jobDetails);
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
