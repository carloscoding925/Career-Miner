import path from "path";
import { fileURLToPath } from "url";
import fs from 'fs/promises';
import { spawn } from "child_process";
import { ScraperConfig, ScraperResult } from "../models/scraper-config";

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

export class ScraperOrchestrator {
    private config: Required<ScraperConfig>;
    private results: ScraperResult[] = [];

    constructor(config: ScraperConfig) {
        this.config = {
            mode: config.mode,
            concurrencyLimit: config.concurrencyLimit ?? 2,
            retryOnFailure: config.retryOnFailure ?? false,
            maxRetries: config.maxRetries ?? 1,
            scraperFilter: config.scraperFilter ?? []
        };
    }

    private async discoverScrapers(): Promise<string[]> {
        const scrapersDir: string = path.join(__dirname, '../scrapers');
        const files: string[] = await fs.readdir(scrapersDir);

        const scraperFiles: string[] = files.filter(file => file.endsWith('.ts') && file.match(/^\d{4}-/)).sort();

        if (this.config.scraperFilter.length > 0) {
            return scraperFiles.filter(file => this.config.scraperFilter.some(id => file.startsWith(id)));
        }

        return scraperFiles;
    }

    private async runSequential(scrapers: string[]): Promise<void> {
        for (let i: number = 0; i < scrapers.length; i++) {
            const scraper: string = scrapers[i];
            console.log(`\n [${i + 1}/${scrapers.length}] Running ${scraper}...`);
            await this.runScraper(scraper);
        }
    }

    private async runParallel(scrapers: string[]): Promise<void> {
        const queue: string[] = [...scrapers];
        const running: Promise<void>[] = [];

        while (queue.length > 0 || running.length > 0) {
            while (running.length < this.config.concurrencyLimit && queue.length > 0) {
                const scraper: string | undefined = queue.shift();

                if (scraper === undefined) {
                    break;
                }

                const promise = this.runScraper(scraper).then(() => {
                    running.splice(running.indexOf(promise), 1);
                });
                running.push(promise);
            }

            if (running.length > 0) {
                await Promise.race(running);
            }
        }
    }

    private async runScraper(scraper: string, retryCount = 0): Promise<void> {
        const scraperPath: string = path.join(__dirname, '../scrapers', scraper);
        const startTime: number = Date.now();

        return new Promise((resolve) => {
            const child = spawn('node', ['--loader', 'ts-node/esm', scraperPath], {
                stdio: 'inherit'
            });

            child.on('close', async (code) => {
                const duration: number = Date.now() - startTime;
                const success: boolean = code === 0;

                if (!success && this.config.retryOnFailure && retryCount < this.config.maxRetries) {
                    console.log(`\n ⚠️ ${scraper} failed. Retrying (${retryCount + 1}/${this.config.maxRetries})...`);
                    await this.runScraper(scraper, retryCount + 1);
                    resolve();
                }
                else {
                    this.results.push({
                        scraper,
                        success,
                        error: success ? undefined : `Exit Code: ${code}`,
                        duration,
                        retries: retryCount
                    });

                    const status: string = success ? '✓' : '✗';
                    const durationSec: string = (duration / 1000).toFixed(2);
                    console.log(`${status} ${scraper} completed in ${durationSec}s`);

                    resolve();
                }
            });

            child.on('error', (error) => {
                const duration: number = Date.now() - startTime;
                this.results.push({
                    scraper,
                    success: false,
                    error: error.message,
                    duration,
                    retries: retryCount
                });
                console.error(`✗ ${scraper} error: ${error.message}`);
                resolve();
            });
        });
    }

    private printSummary(totalDuration: number): void {
      console.log('\n' + '═'.repeat(50));
      console.log('📊 SCRAPING SUMMARY');
      console.log('═'.repeat(50));

      const successful = this.results.filter(r => r.success).length;
      const failed = this.results.filter(r => !r.success).length;
      const totalScrapers = this.results.length;

      console.log(`Total Scrapers: ${totalScrapers}`);
      console.log(`✓ Successful: ${successful}`);
      console.log(`✗ Failed: ${failed}`);
      console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

      if (failed > 0) {
        console.log('\nFailed Scrapers:');
        this.results
          .filter(r => !r.success)
          .forEach(r => {
            console.log(`  • ${r.scraper}: ${r.error}`);
          });
      }

      const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
      console.log(`\nAverage Scraper Duration: ${(avgDuration / 1000).toFixed(2)}s`);

      const retriedScrapers = this.results.filter(r => r.retries > 0);
      if (retriedScrapers.length > 0) {
        console.log(`\nScrapers that required retries: ${retriedScrapers.length}`);
      }

      console.log('═'.repeat(50));
    }

    async run(): Promise<void> {
        console.log("🚀 Starting Scraper Orchestrator");
        console.log(`Mode: ${this.config.mode.toUpperCase()}`);

        if (this.config.mode === 'parallel') {
            console.log(`Concurrency Limit: ${this.config.concurrencyLimit}`);
        }

        console.log('-'.repeat(50));

        const startTime: number = Date.now();
        const scrapers: string[] = await this.discoverScrapers();

        if (scrapers.length === 0) {
            console.log(`⚠️  No scrapers found`);
            return;
        }

        console.log(`Found ${scrapers.length} scraper(s)`);
        console.log('-'.repeat(50));

        if (this.config.mode === 'sequential') {
            await this.runSequential(scrapers);
        }
        else {
            await this.runParallel(scrapers);
        }

        const totalDuration = Date.now() - startTime;
        this.printSummary(totalDuration);
    }
}
