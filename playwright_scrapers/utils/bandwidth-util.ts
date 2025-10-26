import { Request } from "playwright";
import { BandwidthStats, RequestStats } from "../models/bandwidth.js";

export class BandwidthTracker {
    private stats: BandwidthStats = {
        totalRequestBytes: 0,
        totalResponseBytes: 0,
        totalBytes: 0,
        requestCount: 0,
        breakdown: {
            requestHeaders: 0,
            requestBody: 0,
            responseHeaders: 0,
            responseBody: 0
        } as RequestStats
    };

    async trackRequest(request: Request): Promise<void> {
        try {
            const sizes = await request.sizes();

            this.stats.requestCount++;
            this.stats.breakdown.requestHeaders += sizes.requestHeadersSize;
            this.stats.breakdown.requestBody += sizes.requestBodySize;
            this.stats.breakdown.responseHeaders += sizes.responseHeadersSize;
            this.stats.breakdown.responseBody += sizes.responseBodySize;

            const requestBytes: number = sizes.requestHeadersSize + sizes.requestBodySize;
            const responseBytes: number = sizes.responseHeadersSize + sizes.responseBodySize;

            this.stats.totalRequestBytes += requestBytes;
            this.stats.totalResponseBytes += responseBytes;
            this.stats.totalBytes += requestBytes + responseBytes;
        }
        catch (error) {
            console.log("Failed to get request sizes: " + error);
        }
    }

    getStats(): BandwidthStats {
        return {...this.stats};
    }

    reset(): void {
        this.stats = {
            totalRequestBytes: 0,
            totalResponseBytes: 0,
            totalBytes: 0,
            requestCount: 0,
            breakdown: {
                requestHeaders: 0,
                requestBody: 0,
                responseHeaders: 0,
                responseBody: 0
            }
        }; 
    }

    formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k: number = 1024;
        const sizes: string[] = ['Bytes', 'KB', 'MB', 'GB'];
        const i: number = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    printSummary(): void {
        const stats = this.getStats();
        console.log('\n═══════════════════════════════════════');
        console.log('         BANDWIDTH USAGE REPORT        ');
        console.log('═══════════════════════════════════════');
        console.log(`Total Requests:      ${stats.requestCount}`);
        console.log(`Total Sent:          ${this.formatBytes(stats.totalRequestBytes)}`);
        console.log(`Total Received:      ${this.formatBytes(stats.totalResponseBytes)}`);
        console.log(`TOTAL BANDWIDTH:     ${this.formatBytes(stats.totalBytes)}`);
        console.log('\n--- Breakdown ---');
        console.log(`Request Headers:     ${this.formatBytes(stats.breakdown.requestHeaders)}`);
        console.log(`Request Body:        ${this.formatBytes(stats.breakdown.requestBody)}`);
        console.log(`Response Headers:    ${this.formatBytes(stats.breakdown.responseHeaders)}`);
        console.log(`Response Body:       ${this.formatBytes(stats.breakdown.responseBody)}`);
        console.log('═══════════════════════════════════════\n'); 
    }

    returnStats(): BandwidthStats {
        return this.stats;
    }
}