import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_ENGINEERING } from "../constants/search-terms.js";
import { FILTER_NEW_YORK_LONG, FILTER_REMOTE_US, FILTER_SAN_FRANCISCO } from "../constants/filters.js";
import { FullJobDetails, PostingCoverData, ScrapedData } from "../models/data-storage.js";
import { validateJobDetails } from "../utils/data-util.js";
import { CompanyNames } from "../models/company-names.js";
import { dataOutputDirectory, usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";

async function scrapeSeatGeekCareers() {
    console.log("Running Scraper 0007 - Affirm Careers");

    // File Variables
    const __filename: string = fileURLToPath(import.meta.url);
    const __dirname: string = path.dirname(__filename);
    const scraperPrefix: string = getFilePrefix(__filename);

    // Init Bandwidth Tracking Util
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
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.AFFIRM, {
            waitUntil: 'load'
        });

        await page.waitForTimeout(3000);

        // Navigate to Openings Page and Filter Jobs
        await page.getByRole('link', { name: 'View openings' }).click();
        await page.waitForTimeout(1000);

        console.log(`Filtering by Department: ${SEARCH_ENGINEERING}`);
        await page.getByLabel('Department').selectOption(SEARCH_ENGINEERING);
        await page.waitForTimeout(1000);

        // Gather all Job Posting Data
        const jobCards: Locator[] = await page.locator('a[data-testid="jobCard"]').all();
        const officeLocations: string[] = [FILTER_REMOTE_US, FILTER_SAN_FRANCISCO, FILTER_NEW_YORK_LONG];
        const jobUrls: PostingCoverData[] = [];

        for (let i = 0; i < jobCards.length; i++) {
            const location: string | null = await jobCards[i].locator('.JobCard-office--tctKv').textContent();
            const url: string = await jobCards[i].getAttribute('href') ?? "";

            if (location && officeLocations.includes(location) && url.includes('https://')) {
                const title: string = await jobCards[i].locator('.JobCard-title--4edEZ').textContent() ?? "";

                jobUrls.push({
                    title: title.trim(),
                    jobUrl: url.trim()
                });
            }
        }

        console.log(`Found ${jobUrls.length} Job Postings`);

        const jobListings: FullJobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < jobUrls.length; i++) {
            const job: PostingCoverData = jobUrls[i];
            console.log(`\nScraping Job ${i + 1}/${jobUrls.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load' });

                const location: string = await page.locator('.job__location div').textContent() ?? "";

                const jobDescription: string = await page.locator('.job__description.body > div').nth(1).textContent() ?? "";

                const descriptionText: string = await page.locator('.job__description.body').textContent() ?? "";

                let payRangeMatch: RegExpMatchArray | null = descriptionText.match(/\$[\d,]+\s*-\s*\$?[\d,]+/);
                let payRange: string = "";

                if (payRangeMatch) {
                    payRange = payRangeMatch[0];
                } else {
                    const hourlyRateMatch: RegExpMatchArray | null = descriptionText.match(/USA hourly base pay:\s*\$([\d,]+(?:\.\d{2})?)/);
                    if (hourlyRateMatch) {
                        payRange = `$${hourlyRateMatch[1]}`;
                    }
                }

                const jobDetails: FullJobDetails = {
                    jobUrl: job.jobUrl,
                    jobTitle: job.title,
                    description: jobDescription.trim(),
                    payRange: payRange.trim(),
                    location: location.trim(),
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

        if (jobUrls.length === 0 || jobListings.length === 0) {
            console.log("No Listings Found");

            /*
                Future Implementation - Connect to Slack/Discord to notify of potentially broken scraper or no Listings
            */
        }
        else if (errorCount > 0) {
            console.log(`Error Scraping Jobs - ${successCount} Successful Scrapes - ${errorCount} Unsuccessful Scrapes`);

            /*
                Future Implementation - Connect to Slack/Discord Channel to notify of failure
            */
        }
        else {
            console.log(`\nSuccessfully Scraped ${successCount} Jobs With ${errorCount} Errors`);

            // Create Data JSON
            const scrapedData: ScrapedData = {
                companyName: CompanyNames.AFFIRM,
                scrapedAt: new Date().toISOString(),
                searchTerm: SEARCH_ENGINEERING,
                totalJobs: jobListings.length,
                jobs: jobListings
            };

            // Delete old output file and store new file
            const outputDir: string = path.join(__dirname, dataOutputDirectory);
            deleteOldFiles(outputDir, scraperPrefix);
            writeNewFile(outputDir, scraperPrefix, scrapedData);
        }
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        bandwidthTracker.printSummary();

        const outputDir: string = path.join(__dirname, usageOutputDirectory);
        deleteOldFiles(outputDir, scraperPrefix);
        writeNewFile(outputDir, scraperPrefix, bandwidthTracker.returnStats());

        await browser.close();
        console.log("\n Finished Running - Scraper 0007 - Affirm Careers");
    }
}

scrapeSeatGeekCareers();
