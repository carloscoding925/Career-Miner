import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { dataOutputDirectory, usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_JANE_STREET, SEARCH_TECHNOLOGY } from "../constants/search-terms.js";
import { FILTER_NEW_YORK } from "../constants/filters.js";
import { FullJobDetails, PostingCoverData, ScrapedData } from "../models/data-storage.js";
import { validateJobDetails } from "../utils/data-util.js";
import { CompanyNames } from "../models/company-names.js";
import { sendToApi } from "../utils/api-util.js";

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
        const experiencedQuantJobLinks: Locator[] = await page.locator('.jobs-container a').all();
        console.log(`\n Found ${experiencedQuantJobLinks.length} jobs under the ${SEARCH_JANE_STREET} Experienced Category`);

        for (const link of experiencedQuantJobLinks) {
            const href: string | null = await link.getAttribute('href');
            const titleElement: string | null = await link.locator('.item.experienced.position p').textContent();

            if (href && titleElement) {
                jobUrls.push({
                    title: titleElement.trim(),
                    jobUrl: baseUrl + href
                });
            }
        }

        await page.selectOption('.department-select', SEARCH_TECHNOLOGY);
        await page.waitForTimeout(3000);

        const experiencedTechJobLinks: Locator[] = await page.locator('.jobs-container a').all();
        console.log(`\n Found ${experiencedTechJobLinks.length} jobs under the ${SEARCH_TECHNOLOGY} Experienced Category`);

        for (const link of experiencedTechJobLinks) {
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

        await page.evaluate(() => {
            window.scrollTo(0, 400);
        });
        await page.waitForTimeout(1500);

        await page.locator('.location-select').last().selectOption(FILTER_NEW_YORK);
        await page.locator('.department-select').last().selectOption(SEARCH_JANE_STREET);
        await page.waitForTimeout(3000);

        // Extract all job postings
        const newGradQuantJobLinks: Locator[] = await page.locator('.jobs-container a').all();
        console.log(`\n Found ${newGradQuantJobLinks.length} jobs under the ${SEARCH_JANE_STREET} New Grad Category`);

        for (const link of newGradQuantJobLinks) {
            const href: string | null = await link.getAttribute('href');
            const titleElement: string | null = await link.locator('.item.students-and-new-grads.position p').textContent();

            if (href && titleElement) {
                jobUrls.push({
                    title: titleElement.trim(),
                    jobUrl: baseUrl + href
                });
            }
        }

        await page.locator('.department-select').last().selectOption(SEARCH_TECHNOLOGY);
        await page.waitForTimeout(3000);

        const newGradTechJobLinks: Locator[] = await page.locator('.jobs-container a').all();
        console.log(`\n Found ${newGradTechJobLinks.length} jobs under the ${SEARCH_TECHNOLOGY} New Grad Category`);

        for (const link of newGradTechJobLinks) {
            const href: string | null = await link.getAttribute('href');
            const titleElement: string | null = await link.locator('.item.students-and-new-grads.position p').textContent();

            if (href && titleElement) {
                jobUrls.push({
                    title: titleElement.trim(),
                    jobUrl: baseUrl + href
                });
            }
        }

        // Deduplicate jobs based on jobUrl
        const uniqueJobs: PostingCoverData[] = Array.from(
            new Map(jobUrls.map(job => [job.jobUrl, job])).values()
        );

        console.log(`\n Found ${uniqueJobs.length} unique jobs (${jobUrls.length} total before deduplication)`);

        const jobListings: FullJobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < uniqueJobs.length; i++) {
            const job: PostingCoverData = uniqueJobs[i];
            console.log(`\nScraping Job ${i + 1}/${uniqueJobs.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load' });
                await page.waitForTimeout(1000);

                const location: string = await page.locator('p.name.city').textContent() ?? "";

                const descriptionElement = await page.locator('.col-12').first();
                const description: string = await descriptionElement.textContent() ?? "";

                const salaryExists: boolean = await page.locator('.salary-range-disclosure').count() > 0;
                let salaryText: string = "N/A"

                if (salaryExists) {
                    salaryText = await page.locator('.salary-range-disclosure').textContent() ?? "";
                }

                const jobDetails: FullJobDetails = {
                    jobUrl: job.jobUrl,
                    jobTitle: job.title,
                    description: description,
                    payRange: salaryText,
                    location: location,
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

        if (uniqueJobs.length === 0 || jobListings.length === 0) {
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

            const scrapedData: ScrapedData = {
                companyName: CompanyNames.JANE_STREET,
                scrapedAt: new Date().toISOString(),
                searchTerm: `${SEARCH_TECHNOLOGY} - ${SEARCH_JANE_STREET}`,
                totalJobs: uniqueJobs.length,
                jobs: jobListings
            };

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
        console.log("\n Finished Running - Scraper 0009 - Jane Street Careers");
    }
}

scrapeJaneStreetCareers();
