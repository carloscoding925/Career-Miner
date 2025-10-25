import { Page, Request, Response } from "playwright";
import { BandwidthStats } from "../models/bandwidth-usage.js";

export function trackBandwidth(page: Page): BandwidthStats {
    const stats: BandwidthStats = {
        requestBytes: 0,
        responseBytes: 0,
        totalBytes: 0,
        requestCount: 0,
        responseCount: 0,
        unreadableResponses: 0
    };
    
    page.on('request', (request: Request) => {
        stats.requestCount++;

        const url: string = request.url();
        const method: string = request.method();
        const headers = request.headers();
        const postData: string | null = request.postData();

        let requestSize: number = method.length + url.length + 10;

        for (const [key, value] of Object.entries(headers)) {
            requestSize += key.length + value.length + 4;
        }
        requestSize += 2;

        if (postData) {
            requestSize += Buffer.byteLength(postData, 'utf8');
        }

        stats.requestBytes += requestSize;
    });

    page.on('response', async (response: Response) => {
        stats.responseCount++;

        try {
            const headers = response.headers();
            let responseSize: number = 15 + response.statusText().length;

            for (const [key, value] of Object.entries(headers)) {
                responseSize += key.length + value.length + 4;
            }
            responseSize += 2;

            const contentLength: string = headers['content-length'];
            if (contentLength) {
                responseSize += parseInt(contentLength, 10);
            } else {
                try {
                    const body = await response.body();
                    responseSize += body.length;
                } catch (e) {
                    stats.unreadableResponses++;
                }
            }

            stats.responseBytes += responseSize;
        } catch (error) {
            console.error('Error tracking response:', error);
        }
    });

    return stats;
}

export function logBandwidthResults(stats: BandwidthStats): void {
    stats.totalBytes = stats.requestBytes + stats.responseBytes;

    console.log('\n=== Bandwidth Usage ===');
    console.log(`Requests: ${(stats.requestBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Responses: ${(stats.responseBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total: ${(stats.totalBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total GB: ${(stats.totalBytes / 1024 / 1024 / 1024).toFixed(4)} GB`);
    console.log(`Request Count: ${stats.requestCount}`);
    console.log(`Response Count: ${stats.responseCount}`);
    console.log(`Unreadable Responses: ${stats.unreadableResponses}`);
}