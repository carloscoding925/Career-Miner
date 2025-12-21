import path from "path";
import { fileURLToPath } from "url";
import { getFilePrefix } from "../utils/naming-util.js";
import { BandwidthTracker } from "../utils/bandwidth-util.js";
import { Browser, BrowserContext, chromium, ElementHandle, Page } from "playwright";
import { CompanyUrls } from "../models/companies.js";
import { SEARCH_INFORMATION_TECHNOLOGY } from "../constants/search-terms.js";
import { PostingCoverData } from "../models/data-storage.js";

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
        await page.goto(CompanyUrls.PGE, {
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
            const jobs: PostingCoverData[] = await page.$$eval('#search-results-list ul li a[data-job-id]', (links) => {
                return links.map(link => ({
                    title: link.querySelector('h2')?.textContent?.trim() || '',
                    jobUrl: link.getAttribute('href') || ''
                }));
            });

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
        console.log(jobUrls);
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        bandwidthTracker.printSummary();
        browser.close();
        console.log("\n Finished Running - Scraper 0002 - PG&E Careers");
    }
}

scrapePgeCareers();
