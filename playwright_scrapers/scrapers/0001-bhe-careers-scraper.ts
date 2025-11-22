import { Browser, BrowserContext, chromium, Page } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { dataOutputDirectory, usageOutputDirectory } from "../constants/directories.js";
import { SEARCH_INFORMATION_TECHNOLOGY } from "../constants/search-terms.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";
import { FullJobDetails, JobMetaData, PostingCoverData, ScrapedData } from "../models/data-storage.js";
import { CompanyNames } from "../models/company-names.js";
import { createJobDetails, validateJobDetails } from "../utils/data-util.js";
import { CompanyUrls } from "../models/companies.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";

async function scrapeBheCareers() {
    console.log("Running Scraper 0001 - BHE Careers");

    // File Variables
    const __filename: string = fileURLToPath(import.meta.url);
    const __dirname: string = path.dirname(__filename);
    const scraperPrefix: string = getFilePrefix(__filename);

    // Init bandwidth tracking util
    const bandwidthTracker: BandwidthTracker = new BandwidthTracker();

    // Launch Browser
    const browser: Browser = await chromium.launch({
        headless: false // False to Open Browser, True to Run in Background
    });

    // Browser and Scraper constants
    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    // Resource Blocking and Data Usage
    page.on('requestfinished', async (request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.BHE, {
            waitUntil: "load"
        });

        await page.waitForTimeout(3000);

        console.log(`Entering Job Search Term: ${SEARCH_INFORMATION_TECHNOLOGY}`);
        await page.fill('#keyword-input', SEARCH_INFORMATION_TECHNOLOGY);
        await page.press('#keyword-input', 'Enter');

        await page.waitForLoadState('load');
        console.log("Search Submitted - Loading Results");
        await page.waitForTimeout(3000);

        console.log("Scrolling to Load All Postings");
        let previousJobCount: number = 0;
        let currentJobCount: number = 0;
        let scrollAttempts: number = 0;
        const maxScrollAttempts: number = 10;

        // Scroll to load all jobs
        do {
            previousJobCount = currentJobCount;

            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await page.waitForTimeout(1000);

            currentJobCount = await page.$$eval('.job-result', elements => elements.length);
            console.log("Current Job Count: " + currentJobCount);

            scrollAttempts++;
        } while (currentJobCount > previousJobCount && scrollAttempts < maxScrollAttempts);
        console.log(`Finished Scrolling - ${currentJobCount} Jobs Visible`);

        // Examine every posting and extract job URL
        console.log("Extracting Job URL's");
        const jobUrls: PostingCoverData[] = await page.$$eval('.job-result', (elements) => {
            return elements.map(el => {
                const titleLink: Element | null = el.querySelector('.front-section a');
                const title: string = titleLink?.textContent?.trim() || '';
                const jobUrl: string = titleLink?.getAttribute('href') || '';

                return {
                    title,
                    jobUrl
                } as PostingCoverData;
            });
        });
        console.log(`Found ${jobUrls.length} Job Postings`);

        // Enter every job posting page and extract data
        const jobListings: FullJobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < jobUrls.length; i++) {
            const job: PostingCoverData = jobUrls[i];
            console.log(`\nScraping Job ${i + 1}/${jobUrls.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load' });
                await page.waitForSelector('h1.job-details__title', { timeout: 5000 });

                const jobMetaData: JobMetaData = await page.evaluate(() => {
                    const getTextContent = (selector: string): string => {
                        const element: Element | null = document.querySelector(selector);
                        return element?.textContent?.trim() || '';
                    };

                    const getMetaValue = (titleText: string): string => {
                        const metaItems: NodeListOf<Element> = document.querySelectorAll('.job-meta__item');
                        for (const item of metaItems) {
                            const title: string | undefined = item.querySelector('.job-meta__title')?.textContent?.trim();
                            if (title === titleText) {
                                return item.querySelector('.job-meta__subitem')?.textContent?.trim() || '';
                            }
                        }

                        return '';
                    };

                    return {
                        jobTitle: getTextContent('h1.job-details__title'),
                        description: getTextContent('.job-details__description-content'),
                        payRange: getMetaValue('Pay Range'),
                        location: getMetaValue('Locations'),
                        postingDate: getMetaValue('Posting Date'),
                        jobId: getMetaValue('Job Identification')
                    } as JobMetaData;
                });

                const jobDetails: FullJobDetails = createJobDetails(job.jobUrl, jobMetaData);
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
                companyName: CompanyNames.BHE,
                scrapedAt: new Date().toISOString(),
                searchTerm: SEARCH_INFORMATION_TECHNOLOGY,
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
        console.log("\n Finished Running - Scraper 0001 - BHE Careers");
    }
}

scrapeBheCareers();
