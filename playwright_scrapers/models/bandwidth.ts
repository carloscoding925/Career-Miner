export type BandwidthStats = {
    totalRequestBytes: number,
    totalResponseBytes: number,
    totalBytes: number,
    requestCount: number,
    breakdown: RequestStats
};

export type RequestStats = {
    requestHeaders: number,
    requestBody: number,
    responseHeaders: number,
    responseBody: number
}