import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, ElementHandle, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_INFORMATION_TECHNOLOGY } from "../constants/search-terms.js";
import { FullJobDetails, PostingCoverData, ScrapedData } from "../models/data-storage.js";
import { validateJobDetails } from "../utils/data-util.js";
import { CompanyNames } from "../models/company-names.js";
import { dataOutputDirectory, usageOutputDirectory } from "../constants/directories.js";
import { deleteOldFiles, writeNewFile } from "../utils/file-io-util.js";

async function scrapePgeCareers() {
    console.log("Running Scraper 0002 - PG&E Careers");

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
    const page: Page = await context.newPage();

    // Resource Blocking and Data Usage
    page.on('requestfinished', async (request) => {
        await bandwidthTracker.trackRequest(request);
    });

    try {
        // Page Navigation
        console.log("Navigating to Careers Page");
        await page.goto(CompanyUrls.PGE + '/search-jobs', {
            waitUntil: 'load'
        });
        await page.waitForTimeout(1000);

        // Apply Filters
        console.log("Applying Filters");
        await page.evaluate((filterText) => {
            const toggleButton: HTMLButtonElement = document.querySelector('#category-toggle') as HTMLButtonElement;
            if (toggleButton) {
                toggleButton.classList.add('expandable-child-open');
                toggleButton.setAttribute('aria-expanded', 'true');
            }

            const filterList: HTMLElement = document.querySelector('#category-toggle + .search-filter-list') as HTMLElement;
            if (filterList) {
                filterList.classList.add('expandable-childlist-open');
            }

            const checkbox: HTMLInputElement = document.querySelector(`input[data-facet-type="1"][data-display="${filterText}"]`) as HTMLInputElement;
            if (checkbox) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                checkbox.dispatchEvent(new Event('click', { bubbles: true }));
            }
        }, SEARCH_INFORMATION_TECHNOLOGY);
        await page.waitForTimeout(2000);

        // Extract Job Title and URL from postings
        const jobUrls: PostingCoverData[] = [];
        let pageNumber: number = 1;

        while (true) {
            console.log(`Scraping Page ${pageNumber}`);

            await page.waitForSelector('#search-results-list ul li a[data-job-id]', { state: 'visible' });
            const jobs: PostingCoverData[] = await page.$$eval('#search-results-list ul li a[data-job-id]', (links, baseUrl) => {
                return links.map(link => ({
                    title: link.querySelector('h2')?.textContent?.trim() || '',
                    jobUrl: baseUrl + link.getAttribute('href')
                }));
            }, CompanyUrls.PGE);

            jobUrls.push(...jobs);
            console.log(`Page ${pageNumber}: Found ${jobs.length} jobs`);

            const nextButton: ElementHandle<HTMLElement | SVGElement> | null = await page.$('a.next:not(.disabled)');
            if (!nextButton) {
                console.log(`Finished Scraping ${pageNumber} Pages`);
                break;
            }

            await page.click('a.next');
            await page.waitForTimeout(2000);
            pageNumber++;
        }

        console.log(`\nTotal jobs found: ${jobUrls.length}`);

        const jobListings: FullJobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < jobUrls.length; i++) {
            const job: PostingCoverData = jobUrls[i];
            console.log(`\nScraping Job ${i + 1}/${jobUrls.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load' });
                await page.waitForTimeout(1000);

                // Extract job details
                const jobDetails: FullJobDetails | null = await page.evaluate((job) => {
                    const descriptionDiv: Element | null = document.querySelector('.ats-description.ajd_job-details__ats-description');
                    if (!descriptionDiv) { 
                        return null;
                    }

                    const text: string = descriptionDiv.textContent || '';

                    // Extract Job ID
                    const jobIdMatch: RegExpMatchArray | null = text.match(/Requisition ID\s*#?\s*(\d+)/i);
                    const jobId: string = jobIdMatch ? jobIdMatch[1] : '';

                    // Extract Job Location
                    const locationMatch: RegExpMatchArray | null = text.match(/Job Location:\s*([^\n]+)/i);
                    const location: string = locationMatch ? locationMatch[1].trim() : '';

                    // Extract Pay Range
                    const payRangeMatch: RegExpMatchArray | null = text.match(/Pay range is:\s*\$([0-9,]+)\s*-\s*\$([0-9,]+)/i);
                    const payRange: string = payRangeMatch ? `$${payRangeMatch[1]} - $${payRangeMatch[2]}` : '';

                    // Extract Department Overview description
                    let description: string = '';
                    const paragraphs: HTMLParagraphElement[] = Array.from(descriptionDiv.querySelectorAll('p'));
                    let foundDeptOverview: boolean = false;

                    for (let i = 0; i < paragraphs.length; i++) {
                        const p: HTMLParagraphElement = paragraphs[i];
                        const pText: string = p.textContent || '';

                        // Check if this paragraph contains "Department Overview"
                        if (pText.includes('Department Overview')) {
                            foundDeptOverview = true;
                            continue;
                        }

                        // If we found Department Overview, get the next paragraph as description
                        if (foundDeptOverview && pText.trim()) {
                            description = pText.trim();
                            break;
                        }
                    }

                    return {
                        jobUrl: job.jobUrl,
                        jobTitle: job.title,
                        description: description,
                        payRange: payRange,
                        location: location,
                        postingDate: "N/A",
                        jobId: jobId
                    };
                }, job);

                if (!jobDetails) {
                    console.log(`⚠ Invalid data for job: ${i + 1}/${jobUrls.length} - ${job.title}, skipping`);
                    errorCount++;
                    continue;
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
                companyName: CompanyNames.PGE,
                scrapedAt: new Date().toISOString(),
                searchTerm: SEARCH_INFORMATION_TECHNOLOGY,
                totalJobs: jobListings.length,
                jobs: jobListings
            };

            // Delete old data file and create new file
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

        browser.close();
        console.log("\n Finished Running - Scraper 0002 - PG&E Careers");
    }
}

scrapePgeCareers();
