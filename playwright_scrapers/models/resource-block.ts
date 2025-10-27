export type BlockingOptions = {
    blockImages?: boolean,
    blockStyleSheets?: boolean,
    blockFonts?: boolean,
    blockMedia?: boolean,
    blockAnalytics?: boolean;
    customBlockPatterns?: string[]
}

export const DEFAULT_BLOCKING_OPTIONS: BlockingOptions = {
    blockImages: false,
    blockStyleSheets: false,
    blockFonts: false,
    blockMedia: false,
    blockAnalytics: false,
    customBlockPatterns: []
};

export const ANALYTICS_PATTERNS: string[] = [
    'google-analytics.com',
    'googletagmanager.com',
    'doubleclick.net',
    'facebook.com/tr',
    'connect.facebook.net',
    'analytics.js',
    'gtag.js',
    'hotjar.com',
    'mixpanel.com'
];