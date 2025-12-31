import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_INFORMATION_TECHNOLOGY } from "../constants/search-terms.js";
import { FullJobDetails, PostingCoverData, ScrapedData } from "../models/data-storage.js";
import { validateJobDetails } from "../utils/data-util.js";
import { CompanyNames } from "../models/company-names.js";
import { dataOutputDirectory, usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";
import { sendToApi } from "../utils/api-util.js";

async function scrapeSouthernEdisonCareers() {
    console.log("Running Scraper 0003 - Southern California Edison Careers");

    // File Variables
    const __filename: string = fileURLToPath(import.meta.url);
    const __dirname: string = path.dirname(__filename);
    const scraperPrefix: string = getFilePrefix(__filename);

    // Init Bandwidth Tracker
    const bandwidthTracker: BandwidthTracker = new BandwidthTracker();

    // Launch Browser
    const browser: Browser = await chromium.launch({
        headless: process.env.HEADLESS === "true"
    });

    // Browser and Scraper Constants
    const context: BrowserContext = await browser.newContext();
    const page: Page = await browser.newPage();

    // Resource Blocking and Data Usage
    page.on('requestfinished', async (request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.SCE, {
            waitUntil: "load"
        });
        await page.waitForTimeout(3000);

        await page.getByRole('button', { name: 'Search' }).last().click();
        await page.waitForTimeout(1000);

        // Filter Jobs
        console.log(`Filtering Jobs by Category: ${SEARCH_INFORMATION_TECHNOLOGY}`);
        await page.selectOption('#cws_jobsearch_primary_category', SEARCH_INFORMATION_TECHNOLOGY);
        await page.waitForTimeout(1000);

        const jobUrls: PostingCoverData[] = [];
        let currentPage: number = 1;

        while (true) {
            console.log(`Scraping Page ${currentPage}`);

            await page.waitForSelector('#widget-jobsearch-results-list .job');
            await page.waitForTimeout(1000); 

            const jobs: Locator[] = await page.locator('#widget-jobsearch-results-list .job').all();

            for (const job of jobs) {
                const titleLink: Locator = job.locator('.jobTitle a');
                const title: string = await titleLink.textContent() ?? "";
                const url: string = await titleLink.getAttribute('href') ?? "";

                jobUrls.push({
                    title: title.trim(),
                    jobUrl: CompanyUrls.SCE + url.trim()
                });
            }

            const nextButton: Locator = page.locator('a[aria-label="Go to the next page of results."]');
            const hasNextPage: boolean = await nextButton.count() > 0;

            if (!hasNextPage) {
                console.log("Reached Last Page");
                break;
            }

            await nextButton.click();
            await page.waitForLoadState('networkidle');
            currentPage++;
        }

        const jobListings: FullJobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < jobUrls.length; i++) {
            const job: PostingCoverData = jobUrls[i];
            console.log(`\nScraping Job ${i + 1}/${jobUrls.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load' });
                await page.waitForSelector('.job-details__info');

                const jobIdElement: Locator = page.locator('li[title="Job ID"]');
                const jobIdText: string = await jobIdElement.textContent() ?? "";
                const jobId: string = jobIdText.replace(/Job ID:\s*/i, '').trim();

                const locationElement: Locator = page.locator('li[title="Location"]');
                const locationText: string = await locationElement.textContent() ?? "";
                const location: string = locationText.replace(/Location:\s*/i, '').trim();

                const payElement: Locator = page.locator('.job-details__info-salary .salary-range');
                const payElementText: string = await payElement.evaluate(el => {
                    const clone: HTMLElement = el.cloneNode(true) as HTMLElement;

                    const tooltip: Element | null = clone.querySelector('.tooltiptext');
                    if (tooltip) {
                        tooltip.remove();
                    }

                    const icon: Element | null = clone.querySelector('.tool-trigger');
                    if (icon) {
                        icon.remove();
                    }

                    return clone.innerText.trim();
                });
                const payRange: string = payElementText.trim();

                await page.waitForSelector('.jddescription');
                const descriptionElement: Locator = page.locator('.jddescription .fusion-column-wrapper');
                const description: string = await descriptionElement.innerText();
                description.trim();

                const jobDetails: FullJobDetails = {
                    jobUrl: job.jobUrl,
                    jobTitle: job.title,
                    description: description,
                    payRange: payRange,
                    location: location,
                    postingDate: "N/A",
                    jobId: jobId
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
                companyName: CompanyNames.SCE,
                scrapedAt: new Date().toISOString(),
                searchTerm: SEARCH_INFORMATION_TECHNOLOGY,
                totalJobs: jobListings.length,
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
        console.log("\n Finished Running - Scraper 0003 - SCE Careers");
    }
}

scrapeSouthernEdisonCareers();
