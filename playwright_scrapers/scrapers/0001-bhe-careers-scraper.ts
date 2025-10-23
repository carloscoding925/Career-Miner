import { Browser, BrowserContext, chromium, Page } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { outputDirectory } from "../constants/directories.js";
import { departmentSearchTerm } from "../constants/search-terms.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";
import { JobDetails, JobMetaDetails, PostingData, ScrapedData } from "../models/data-storage.js";
import { BHE_CAREERS } from "../constants/companies.js";
import { CompanyNames } from "../models/company-names.js";

async function scrapeBheCareers() {
    console.log("Running Scraper 0001 - BHE Careers");

    // Launch Browser
    const browser: Browser = await chromium.launch({
        headless: false
    });

    // Browser and Scraper constants
    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(BHE_CAREERS, {
            waitUntil: "load"
        });

        await page.waitForTimeout(3000);

        console.log(`Entering Job Search Term: ${departmentSearchTerm}`);
        await page.fill('#keyword-input', departmentSearchTerm);
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
        const jobUrls: PostingData[] = await page.$$eval('.job-result', (elements) => {
            return elements.map(el => {
                const titleLink: Element | null = el.querySelector('.front-section a');
                const title: string = titleLink?.textContent?.trim() || '';
                const jobUrl: string = titleLink?.getAttribute('href') || '';

                return {
                    title,
                    jobUrl
                } as PostingData;
            });
        });
        console.log(`Found ${jobUrls.length} Job Postings`);

        // Enter every job posting page and extract data
        const jobListings: JobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < jobUrls.length; i++) {
            const job: PostingData = jobUrls[i];
            console.log(`\nScraping Job ${i + 1}/${jobUrls.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load' });
                await page.waitForSelector('h1.job-details__title', { timeout: 5000 });

                const jobMetaDetails: JobMetaDetails = await page.evaluate(() => {
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
                    } as JobMetaDetails;
                });

                jobListings.push({
                    jobUrl: job.jobUrl,
                    ...jobMetaDetails
                } as JobDetails );

                console.log(`✓ Successfully Scraped Job: ${job.title}`);
                successCount++;
            } catch (error) {
                console.error(`✗ Error scraping ${job.title}:`, error);
                errorCount++;
            }
        }
        console.log(`Successfully Scraped ${successCount} Jobs With ${errorCount} Errors`);

        // Create Data JSON
        const scrapedData: ScrapedData = {
            companyName: CompanyNames.BHE,
            scrapedAt: new Date().toISOString(),
            searchTerm: departmentSearchTerm,
            totalJobs: jobListings.length,
            jobs: jobListings
        };

        // File and Directory Variables
        const __filename: string = fileURLToPath(import.meta.url);
        const __dirname: string = path.dirname(__filename);
        const scraperPrefix: string = getFilePrefix(__filename);

        // Delete old output file and store new file
        const outputDir: string = path.join(__dirname, outputDirectory);
        deleteOldFiles(outputDir, scraperPrefix);
        writeNewFile(outputDir, scraperPrefix, scrapedData);
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        await browser.close();
        console.log("Finished Running - Scraper 0001 - BHE Careers");
    }
}

scrapeBheCareers();
