export type ConfigMode = "sequential" | "parallel";

export interface ScraperConfig {
    mode: ConfigMode,
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

export function createConfig(): ScraperConfig {
    const mode: ConfigMode | string = process.env.MODE ?? "";
    if (mode !== "sequential" && mode !== "parallel") {
        throw new Error("Invalid Value for Mode");
    }

    const concurrencyLimitText: string | null = process.env.CONCURRENCY_LIMIT ?? null;
    if (!concurrencyLimitText || isNaN(Number(concurrencyLimitText))) {
        throw new Error("Please Set Max Concurrency Limit or use 1 for Default");
    }
    const concurrencyLimit: number = Number(concurrencyLimitText);

    const retryText: string | null = process.env.RETRY ?? null;
    if (!retryText) {
        throw new Error("Please Specify Whether the Scrapers Should Retry on Failure");
    }
    const retry: boolean = Boolean(retryText);

    const maxRetriesText: string | null = process.env.MAX_RETRIES ?? null;
    if (!maxRetriesText || isNaN(Number(maxRetriesText))) {
        throw new Error("Please Set Max Retries or use 1 for Default");
    }
    const maxRetries: number = Number(maxRetriesText);

    return {
        mode: mode,
        concurrencyLimit: concurrencyLimit,
        retryOnFailure: retry,
        maxRetries: maxRetries
    } as ScraperConfig;
}