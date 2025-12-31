import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_TECHNOLOGY } from "../constants/search-terms.js";
import { FullJobDetails, PostingCoverData, ScrapedData } from "../models/data-storage.js";
import { validateJobDetails } from "../utils/data-util.js";
import { CompanyNames } from "../models/company-names.js";
import { dataOutputDirectory, usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";
import { sendToApi } from "../utils/api-util.js";

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
        console.log(`\nFound ${jobUrls.length} Job Postings`);
        
        const jobListings: FullJobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < jobUrls.length; i++) {
            const job: PostingCoverData = jobUrls[i];
            console.log(`\nScraping Job ${i + 1}/${jobUrls.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load' });

                const location: string = await page.locator('.job__location div').textContent() ?? "";

                const descriptionDiv: Locator = page.locator('.job__description > div:nth-child(2)');
                const fullDescription: string = await descriptionDiv.textContent() ?? "";

                const salaryText: string = await page.locator('.job__description p:has-text("Base salary range")').textContent() ?? "";
                const salaryMatch: RegExpMatchArray | null = salaryText.match(/\$[\d,]+\s+to\s+\$[\d,]+/);
                const salaryRange: string = salaryMatch ? salaryMatch[0] : "";

                const jobDetails: FullJobDetails = {
                    jobUrl: job.jobUrl,
                    jobTitle: job.title,
                    description: fullDescription.trim(),
                    payRange: salaryRange.trim(),
                    location: location.trim(),
                    postingDate: "N/A",
                    jobId: "N/A"
                };
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
                companyName: CompanyNames.AMAE_HEALTH,
                scrapedAt: new Date().toISOString(),
                searchTerm: SEARCH_TECHNOLOGY,
                totalJobs: jobListings.length,
                jobs: jobListings
            };

            // Delete old output file and store new file
            const outputDir: string = path.join(__dirname, dataOutputDirectory);
            deleteOldFiles(outputDir, scraperPrefix);
            writeNewFile(outputDir, scraperPrefix, scrapedData);

            // Send data to API
            try {
                await sendToApi(scrapedData);
                console.log("✓ Data successfully sent to Spring API");
            } catch (error) {
                console.error("✗ API call failed");
            }
        }
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        bandwidthTracker.printSummary();

        const outputDir: string = path.join(__dirname, usageOutputDirectory);
        deleteOldFiles(outputDir, scraperPrefix);
        writeNewFile(outputDir, scraperPrefix, bandwidthTracker.returnStats());

        await browser.close();
        console.log("\n Finished Running - Scraper 0006 - Amae Health Careers");
    }
}

scrapeAmaeHealthCareers();
