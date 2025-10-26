export const defaultConfig = {
    startUrl: process.env.START_URL ?? "",
    maxDepth: Number(process.env.MAX_DEPTH ?? 4),
    maxPages: Number(process.env.MAX_PAGES ?? 100),
    sameDomainOnly: true,
    delayRangeMs: [750, 1850],
    userAgent: process.env.USER_AGENT ??
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    viewport: {
        width: Number(process.env.VIEWPORT_WIDTH ?? 1440),
        height: Number(process.env.VIEWPORT_HEIGHT ?? 900)
    },
    outputDir: "output",
    assetsDir: "output/public/assets",
    fontsDir: "output/public/fonts",
    blockedSelectors: [
        '[style*="display:none"]',
        '[style*="visibility:hidden"]',
        '[style*="opacity:0"]',
        '[tabindex="-1"]',
        "[aria-hidden='true']"
    ]
};
export function applyOverrides(config) {
    return {
        ...config,
        startUrl: ensureTrailingSlash(config.startUrl)
    };
}
function ensureTrailingSlash(url) {
    try {
        const parsed = new URL(url);
        if (!parsed.pathname.endsWith("/")) {
            parsed.pathname += "/";
        }
        return parsed.toString();
    }
    catch (error) {
        throw new Error(`Invalid START_URL provided: ${url}`);
    }
}
