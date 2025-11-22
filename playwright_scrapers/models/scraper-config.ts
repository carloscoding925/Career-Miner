export interface ScraperConfig {
    mode: 'sequential' | 'parallel';
    concurrencyLimit?: number;
    retryOnFailure?: boolean;
    maxRetries?: number;
    scraperFilter?: string[];
}

export interface ScraperResult {
    scraper: string;
    success: boolean;
    error?: string;
    duration: number;
    retries: number;
}