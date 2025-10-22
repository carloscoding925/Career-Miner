import { Browser, BrowserContext, chromium, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

type PostingData = {
    title: string,
    jobUrl: string,
    jobId: string
}

type JobMetaDetails = {
    jobTitle: string,
    description: string,
    payRange: string
}

type JobDetails = {
    jobUrl: string,
    jobId: string,
    jobTitle: string,
    description: string,
    payRange: string
}

type ScrapedData = {
    scrapedAt: string,
    searchTerm: string,
    totalJobs: number,
    jobs: JobDetails[]
}

async function scrapeBheCareers() {
    console.log("Running Scraper 0001 - BHE Careers");

    const browser: Browser = await chromium.launch({
        headless: false
    });

    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();
    const pageURL: string = 'https://careers.brkenergy.com/home';
    const jobSearchTerm: string = 'Information Technology';
    const outputDirectory: string = '../data_output';

    try {
        console.log("Navigating to Careers Page");
        await page.goto(pageURL, {
            waitUntil: "load"
        });

        await page.waitForTimeout(3000);

        console.log(`Entering Job Search Term: ${jobSearchTerm}`);
        await page.fill('#keyword-input', jobSearchTerm);
        await page.press('#keyword-input', 'Enter');

        await page.waitForLoadState('load');
        console.log("Search Submitted - Loading Results");
        await page.waitForTimeout(3000);

        console.log("Scrolling to Load All Postings");
        let previousJobCount: number = 0;
        let currentJobCount: number = 0;
        let scrollAttempts: number = 0;
        const maxScrollAttempts: number = 10;

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

        console.log("Extracting Job URL's");
        const jobUrls: PostingData[] = await page.$$eval('.job-result', (elements) => {
            return elements.map(el => {
                const titleLink: Element | null = el.querySelector('.front-section a');
                const title: string = titleLink?.textContent?.trim() || '';
                const jobUrl: string = titleLink?.getAttribute('href') || '';
                const jobId: string = el.querySelector('.title-section__id')?.textContent?.trim() || '';

                return {
                    title,
                    jobUrl,
                    jobId,
                } as PostingData;
            });
        });
        console.log(`Found ${jobUrls.length} Job Postings`);

        const jobListings: JobDetails[] = [];
        let errorCount: number = 0;
        let successCount: number = 0;

        for (let i = 0; i < jobUrls.length; i++) {
            const job: PostingData = jobUrls[i];
            console.log(`\nScraping Job ${i + 1}/${jobUrls.length}: ${job.title}`);

            try {
                await page.goto(job.jobUrl, { waitUntil: 'load' });
                await page.waitForTimeout(1000);

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
                        payRange: getMetaValue('Pay Range')
                    } as JobMetaDetails;
                });

                jobListings.push({
                    jobId: job.jobId,
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

        const scrapedData: ScrapedData = {
            scrapedAt: new Date().toISOString(),
            searchTerm: jobSearchTerm,
            totalJobs: jobListings.length,
            jobs: jobListings
        };

        const outputDir: string = path.join(__dirname, outputDirectory);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }

        const files: string[] = fs.readdirSync(outputDir);
        const oldFiles: string[] = files.filter(file => file.startsWith('0001-bhe-careers-') && file.endsWith('.json'));
        oldFiles.forEach(file => {
            fs.unlinkSync(path.join(outputDir, file));
            console.log(`Deleted Old File: ${file}`)
        });

        const timestamp: string = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const outputFile: string = path.join(outputDir, `0001-bhe-careers-${timestamp}.json`);

        fs.writeFileSync(outputFile, JSON.stringify(scrapedData, null, 2));
        console.log(`Data saved to: ${outputFile}`);
    } catch (error) {
        console.log("Error Occured While Scraping: " + error);
    } finally {
        await browser.close();
        console.log("Finished Running - Scraper 0001 - BHE Careers");
    }
}

scrapeBheCareers();
