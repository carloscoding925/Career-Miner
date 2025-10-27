import { Page, Request, Route } from "playwright";
import { ANALYTICS_PATTERNS, BlockingOptions, DEFAULT_BLOCKING_OPTIONS } from "../models/resource-block.js";

export function setupResourceBlocking(
    page: Page,
    options: BlockingOptions = DEFAULT_BLOCKING_OPTIONS
): void {
    page.route('**/*', (route: Route) => {
        const request: Request = route.request();
        const resourceType: string = request.resourceType();
        const url: string = request.url();

        if (options.blockImages && resourceType === 'image') {
            route.abort();
            return;
        }

        if (options.blockStyleSheets && resourceType === 'stylesheet') {
            route.abort();
            return;
        }

        if (options.blockFonts && resourceType === 'font') {
            route.abort();
            return;
        }

        if (options.blockMedia && resourceType === 'media') {
            route.abort();
            return;
        }

        if (options.blockAnalytics &&
            ANALYTICS_PATTERNS.some(pattern => url.includes(pattern))) {
            route.abort();
            return;
        }

        if (options.customBlockPatterns &&
            options.customBlockPatterns.some(pattern => url.includes(pattern))) {
            route.abort();
            return;
        }

        route.continue();
    });
}