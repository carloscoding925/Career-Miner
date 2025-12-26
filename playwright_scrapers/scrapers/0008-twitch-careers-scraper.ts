import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { dataOutputDirectory, usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_SOFTWARE } from "../constants/search-terms.js";
import { FullJobDetails, PostingCoverData, ScrapedData } from "../models/data-storage.js";
import { validateJobDetails } from "../utils/data-util.js";
import { CompanyNames } from "../models/company-names.js";

async function scrapeTwitchCareers() {
    console.log("Running Scraper 0008 - Twitch Careers");

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
    const page: Page = await context.newPage();

    page.on('requestfinished', async (request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.TWITCH, {
            waitUntil: 'load'
        });

        await page.waitForTimeout(3000);

        // Extract Job Title and Posting URLS
        console.log("Extracting Posting URL's");
        await page.getByRole('link', { name: 'Job Openings' }).click();
        await page.waitForTimeout(2000);

        const searchBox: Locator = page.getByRole('textbox');
        await searchBox.waitFor({ state: 'visible' });
        await searchBox.fill(SEARCH_SOFTWARE);
        await page.waitForTimeout(2000);

        await page.waitForSelector('.mb-14 .border-b a.text-twitch-purple');
        const jobs: PostingCoverData[] = await page.locator('.mb-14 .border-b a.text-twitch-purple').evaluateAll((links) => {
            return links.map(link => ({
                title: link.textContent?.trim() || '',
                jobUrl: link.getAttribute('href') || ''
            }));
        });

        const jobUrls: PostingCoverData[] = jobs.map(job => ({
            title: job.title,
            jobUrl: CompanyUrls.TWITCH + job.jobUrl
        }));
        console.log(`Found ${jobUrls.length} Job Postings`);

        // Extract Posting Data
        const jobListings: FullJobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < jobUrls.length; i++) {
            const job: PostingCoverData = jobUrls[i];
            console.log(`\n Scraping Job ${i + 1}/${jobUrls.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load'});
                await page.waitForTimeout(1000);

                const location: string = await page.locator('.flex.flex-col.p-6.bg-white > div').nth(1).textContent() ?? "";

                const jobIdElement: Locator = await page.locator('.prose p:has-text("Job ID:")').first();
                const jobId: string = await jobIdElement.count() > 0 ? await jobIdElement.textContent() ?? "" : "N/A";

                const payRangeElement: Locator = await page.locator('.pay-range').first();
                const payRange: string = await payRangeElement.count() > 0 ? await payRangeElement.textContent() ?? "" : "N/A";

                const description: string = await page.locator('.prose').evaluate((proseDiv) => {
                    let aboutRoleHeader: Element | undefined = Array.from(proseDiv.querySelectorAll('h3')).find(
                        h3 => h3.textContent?.includes('About the Role')
                    );

                    if (!aboutRoleHeader) {
                        aboutRoleHeader = Array.from(proseDiv.querySelectorAll('p')).find(
                            p => p.querySelector('strong')?.textContent?.includes('About the Role')
                        );
                    }

                    if (!aboutRoleHeader) {
                        return "";
                    }

                    let description: string = "";
                    let currentElement: Element | null = aboutRoleHeader.nextElementSibling;

                    while (currentElement) {
                        if (currentElement.tagName === 'H3') {
                            break;
                        }
                        if (currentElement.tagName === 'P' && currentElement.querySelector('strong')?.textContent?.includes(':')) {
                            break;
                        }

                        description = description + currentElement.textContent?.trim() + '\n\n';
                        currentElement = currentElement.nextElementSibling;
                    }

                    return description.trim();
                });

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

            const scrapedData: ScrapedData = {
                companyName: CompanyNames.TWITCH,
                scrapedAt: new Date().toISOString(),
                searchTerm: `${SEARCH_SOFTWARE}`,
                totalJobs: jobListings.length,
                jobs: jobListings
            };

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
        console.log("\n Finished Running - Scraper 0008 - Twitch Careers");
    }
}

scrapeTwitchCareers();
