import { ScraperConfig } from "../models/scraper-config.js";
import { ScraperOrchestrator } from "./orchestrator.js";

const sequentialConfig: ScraperConfig = {
    mode: 'sequential',
    retryOnFailure: true,
    maxRetries: 2
};

const parallelConfig: ScraperConfig = {
    mode: 'parallel',
    concurrencyLimit: 2,
    retryOnFailure: true,
    maxRetries: 1
};

const filteredConfig: ScraperConfig = {
    mode: 'sequential',
    concurrencyLimit: 1,
    retryOnFailure: false,
    maxRetries: 0,
    scraperFilter: ['0001', '0005']
};

const config: ScraperConfig = filteredConfig;
const orchestrator = new ScraperOrchestrator(config);

orchestrator.run().catch(console.error);