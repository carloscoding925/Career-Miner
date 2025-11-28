import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, FrameLocator, Locator, Page } from "playwright";
import { dataOutputDirectory, usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_ENGINEERING } from "../constants/search-terms.js";
import { FullJobDetails, PostingCoverData, ScrapedData } from "../models/data-storage.js";
import { validateJobDetails } from "../utils/data-util.js";
import { CompanyNames } from "../models/company-names.js";

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
        headless: process.env.HEADLESS === 'true'
    });

    // Browser and Scraper constants
    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    // Resource Blocking and Data Usage
    page.on('requestfinished', async(request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.CITIZEN_HEALTH, {
            waitUntil: "load"
        });

        console.log('Waiting for job board iframe to load...');

        // Scroll the iframe into view on the main page
        const iframeElement: Locator = page.locator('iframe[title*="Ashby"], iframe[src*="ashby"]');
        await iframeElement.waitFor({ state: 'visible', timeout: 10000 });
        await iframeElement.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        const iframe: FrameLocator = page.frameLocator('iframe[title*="Ashby"], iframe[src*="ashby"]');

        console.log(`Filtering Job Listings by Department: ${SEARCH_ENGINEERING}`);

        const departmentSelect = iframe.locator('select[name="departmentId"]');
        await departmentSelect.waitFor({ state: 'visible', timeout: 10000 });
        await departmentSelect.selectOption({ label: SEARCH_ENGINEERING });
        await page.waitForTimeout(1500);

        console.log('Successfully filtered jobs by department');

        // Extract job listings
        console.log('Extracting job listings...');

        const jobListingsContainer: Locator = iframe.locator('.ashby-job-posting-brief-list');
        await jobListingsContainer.waitFor({ state: 'visible', timeout: 3000 });

        const jobLinks: Locator = jobListingsContainer.locator('a');
        const jobCount: number = await jobLinks.count();
        console.log(`Found ${jobCount} job listings`);

        const jobUrls: PostingCoverData[] = [];

        for (let i = 0; i < jobCount; i++) {
            const link: Locator = jobLinks.nth(i);
            const title: string = await link.locator('.ashby-job-posting-brief-title').textContent() ?? "";
            const url: string = await link.getAttribute('href') ?? "";

            jobUrls.push({
                title: title?.trim(),
                jobUrl: `https://jobs.ashbyhq.com${url}`
            });
        }

        // Enter every job posting and extract data
        const jobListings: FullJobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < jobUrls.length; i++) {
            const job: PostingCoverData = jobUrls[i];
            console.log(`\nScraping Job ${i + 1}/${jobUrls.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load' });
                await page.waitForTimeout(1000);

                const leftPane: Locator = page.locator('._left_oj0x8_418.ashby-job-posting-left-pane');
                await leftPane.waitFor({ state: 'visible', timeout: 5000 });

                // Extract location
                let location: string = "";
                const locationSection: Locator = leftPane.locator('._section_101oc_37').filter({ hasText: 'Location' }).first();
                const locationCount: number = await locationSection.count();

                if (locationCount > 0) {
                    location = await locationSection.locator('p').first().textContent() ?? "";
                }

                // Extract pay range
                let payRange: string = "";
                const compensationSection: Locator = leftPane.locator('._section_101oc_37').filter({ hasText: 'Compensation' });
                const compCount: number = await compensationSection.count();

                if (compCount > 0) {
                    const compSpan: Locator = compensationSection.locator('span._compensationTierSummary_oj0x8_327').first();
                    const compSpanCount: number = await compSpan.count();

                    if (compSpanCount > 0) {
                        payRange = await compSpan.textContent({ timeout: 5000 }) ?? "";
                    }
                }

                // Extract job description (The Role section only)
                let description: string = "";
                const descriptionContainer: Locator = page.locator('._descriptionText_oj0x8_198');
                const descContainerCount: number = await descriptionContainer.count();

                if (descContainerCount > 0) {
                    const roleHeading: Locator = descriptionContainer.locator('h2:has-text("The Role")');
                    if (await roleHeading.count() > 0) {
                        description = await roleHeading.evaluate((h2) => {
                            let text: string = "";
                            let sibling: Element | null = h2.nextElementSibling;
                            while (sibling && sibling.tagName !== 'H2' && sibling.tagName !== 'H3') {
                                if (sibling.tagName === 'P' && sibling.textContent?.trim()) {
                                    text += sibling.textContent.trim() + " ";
                                }
                                sibling = sibling.nextElementSibling;
                            }
                            return text.trim();
                        });
                    }
                }

                const jobDetails: FullJobDetails = {
                    jobUrl: job.jobUrl,
                    jobTitle: job.title,
                    description: description,
                    payRange: payRange.trim(),
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
                companyName: CompanyNames.CITIZEN_HEALTH,
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
        console.log("\n Finished Running - Scraper 0005 - Citizen Health Careers");
    }
}

scrapeCitizenHealthCareers();
