import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { applyOverrides, defaultConfig } from "./config.js";
import {
  PageRecord,
  createAssetPath,
  delay,
  ensureDir,
  isSameRegistrableDomain,
  normalizeUrl,
  slugifyUrl,
  writeJson,
  writeText
} from "./utils.js";

type TraversalStatus = "visited" | "skipped" | "blocked";

type TraversalEntry = {
  url: string;
  depth: number;
  parent?: string;
  status: TraversalStatus;
  reason?: string;
};

type RobotsRules = {
  disallow: string[];
  allow: string[];
};

function inferFontExtension(contentType: string, url: URL): string | null {
  if (contentType.includes("font/woff2") || url.pathname.endsWith(".woff2")) {
    return "woff2";
  }
  if (contentType.includes("font/woff") || url.pathname.endsWith(".woff")) {
    return "woff";
  }
  if (contentType.includes("font/ttf") || url.pathname.endsWith(".ttf")) {
    return "ttf";
  }
  if (contentType.includes("font/otf") || url.pathname.endsWith(".otf")) {
    return "otf";
  }
  return null;
}

function extractAssetUrls(): string[] {
  const urls = new Set<string>();

  function addUrl(value: string | null | undefined) {
    if (!value) return;
    if (value.startsWith("data:")) return;
    urls.add(value);
  }

  document
    .querySelectorAll("img[src]")
    .forEach((img) => addUrl(img.getAttribute("src")));

  document
    .querySelectorAll("source[srcset]")
    .forEach((source) => {
      const srcset = source.getAttribute("srcset");
      if (!srcset) return;
      const candidates = srcset.split(",").map((entry) => entry.trim().split(" ")[0]);
      candidates.forEach(addUrl);
    });

  document
    .querySelectorAll("[style*='background-image']")
    .forEach((element) => {
      const styles = window.getComputedStyle(element);
      const match = /url\(([^)]+)\)/.exec(styles.backgroundImage);
      if (match) {
        addUrl(match[1].replace(/['"]/g, ""));
      }
    });

  document
    .querySelectorAll("link[rel='stylesheet'][href]")
    .forEach((link) => addUrl(link.getAttribute("href")));

  return Array.from(urls);
}

async function loadRobots(base: URL): Promise<RobotsRules> {
  try {
    const robotsUrl = new URL("/robots.txt", base);
    const response = await fetch(robotsUrl);
    if (!response.ok) {
      return { disallow: [], allow: [] };
    }

    const body = await response.text();
    const disallow: string[] = [];
    const allow: string[] = [];

    let applies = false;
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const [directive, value] = line.split(":").map((part) => part.trim());
      if (!directive || value === undefined) continue;

      if (/^user-agent$/i.test(directive)) {
        applies = value === "*" || value.toLowerCase().includes("bot");
      } else if (/^disallow$/i.test(directive) && applies) {
        if (value) disallow.push(value);
      } else if (/^allow$/i.test(directive) && applies) {
        if (value) allow.push(value);
      }
    }

    return { disallow, allow };
  } catch (error) {
    console.warn("Failed to load robots.txt", error);
    return { disallow: [], allow: [] };
  }
}

function isAllowedByRobots(rules: RobotsRules, url: URL): boolean {
  const pathToCheck = url.pathname;
  const disallowed = rules.disallow.find((rule) =>
    pathToCheck.startsWith(rule.replace(/\*/g, ""))
  );
  if (!disallowed) return true;

  const allowed = rules.allow.find((rule) =>
    pathToCheck.startsWith(rule.replace(/\*/g, ""))
  );
  return Boolean(allowed);
}

type SitemapNode = {
  url: string;
  title?: string;
  children: Map<string, SitemapNode>;
};

function addToSitemap(root: SitemapNode, record: PageRecord): void {
  const url = new URL(record.url);
  const segments = url.pathname.split("/").filter(Boolean);
  let current = root;

  if (segments.length === 0) {
    current.children.set("home", {
      url: record.url,
      title: record.title ?? "Home",
      children: new Map()
    });
    return;
  }

  segments.forEach((segment, index) => {
    const key = segment || "home";
    if (!current.children.has(key)) {
      current.children.set(key, {
        url: new URL(
          segments.slice(0, index + 1).join("/") || "/",
          `${url.protocol}//${url.host}`
        ).toString(),
        title: index === segments.length - 1 ? record.title : undefined,
        children: new Map()
      });
    } else if (index === segments.length - 1) {
      const node = current.children.get(key);
      if (node) {
        node.title = record.title ?? node.title;
      }
    }

    const next = current.children.get(key);
    if (next) {
      current = next;
    }
  });
}

function renderSitemap(
  node: SitemapNode,
  depth = 0,
  lines: string[] = []
): string[] {
  for (const child of node.children.values()) {
    const label = child.title ? `${child.title} (${child.url})` : child.url;
    lines.push(`${"  ".repeat(depth)}- ${label}`);
    renderSitemap(child, depth + 1, lines);
  }
  return lines;
}

async function downloadAsset(
  assetUrl: string,
  targetDir: string,
  relativeRoot: string,
  cache: Map<string, string>
): Promise<string | null> {
  try {
    if (cache.has(assetUrl)) {
      return cache.get(assetUrl)!;
    }

    const response = await fetch(assetUrl, { redirect: "follow" });
    if (!response.ok) {
      console.warn(`Failed to fetch asset ${assetUrl}: ${response.status}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const url = new URL(assetUrl);
    const fileName = path.basename(url.pathname) || "asset";
    const finalPath = path.join(targetDir, fileName);

    await ensureDir(path.dirname(finalPath));
    await fs.writeFile(finalPath, buffer);

    const relativePath = path.relative(relativeRoot, finalPath);
    cache.set(assetUrl, relativePath);
    return relativePath;
  } catch (error) {
    console.warn(`Failed to download asset ${assetUrl}`, error);
    return null;
  }
}

async function run(): Promise<void> {
  const config = applyOverrides(defaultConfig);
  const baseUrl = new URL(config.startUrl);
  const robotsRules = await loadRobots(baseUrl);

  await ensureDir(config.outputDir);
  await ensureDir(config.assetsDir);
  await ensureDir(config.fontsDir);

  const browser = await chromium.launch({
    headless: process.env.HEADLESS === "false" ? false : true,
    slowMo: 0
  });

  const context = await browser.newContext({
    userAgent: config.userAgent,
    viewport: config.viewport,
    javaScriptEnabled: true,
    colorScheme: "light",
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true
  });

  const fontCache = new Map<string, string>();
  const assetCache = new Map<string, string>();
  const pageRecords = new Map<string, PageRecord>();
  const traversalLog: TraversalEntry[] = [];
  const sitemapRoot: SitemapNode = {
    url: config.startUrl,
    title: "Home",
    children: new Map()
  };

  context.on("response", async (response) => {
    try {
      const url = response.url();
      if (fontCache.has(url)) return;

      const request = response.request();
      const resourceType = request.resourceType();
      const headers = response.headers();
      const isFont =
        resourceType === "font" ||
        /\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(url) ||
        (headers["content-type"]?.includes("font") ?? false);
      if (!isFont) return;

      const body = await response.body();
      const fontUrl = new URL(url);
      let fileName = path.basename(fontUrl.pathname);
      const extension = inferFontExtension(headers["content-type"] ?? "", fontUrl);
      if (!path.extname(fileName)) {
        fileName = `${fileName}.${extension ?? "woff2"}`;
      }
      const finalPath = path.join(config.fontsDir, fileName);
      await ensureDir(path.dirname(finalPath));
      await fs.writeFile(finalPath, body);
      const relativePath = path.relative(config.outputDir, finalPath);
      fontCache.set(url, relativePath);
    } catch (error) {
      console.warn("Failed to persist font", error);
    }
  });

  const queue: TraversalEntry[] = [
    {
      url: config.startUrl,
      depth: 0,
      status: "visited"
    }
  ];

  const visited = new Set<string>();

  while (queue.length > 0 && pageRecords.size < config.maxPages) {
    const current = queue.shift()!;
    if (visited.has(current.url)) continue;

    const parsedUrl = new URL(current.url);
    if (config.sameDomainOnly && !isSameRegistrableDomain(baseUrl, parsedUrl)) {
      traversalLog.push({ ...current, status: "skipped", reason: "external-domain" });
      continue;
    }

    if (!isAllowedByRobots(robotsRules, parsedUrl)) {
      traversalLog.push({ ...current, status: "blocked", reason: "robots.txt" });
      continue;
    }

    if (current.depth > config.maxDepth) {
      traversalLog.push({ ...current, status: "skipped", reason: "max-depth" });
      continue;
    }

    visited.add(current.url);
    traversalLog.push({ ...current, status: "visited" });

    const page = await context.newPage();
    await page.setExtraHTTPHeaders({
      DNT: "1"
    });

    const [minDelay, maxDelay] = config.delayRangeMs;
    await delay(minDelay, maxDelay);

    try {
      const response = await page.goto(current.url, {
        waitUntil: "networkidle",
        timeout: 45000
      });

      if (!response || !response.ok()) {
        console.warn(`Non-200 response for ${current.url}`);
      }

      await page.waitForTimeout(750);

      const metadata = await page.evaluate(() => {
        const metaTags = Array.from(document.querySelectorAll("meta"))
          .map((tag) => ({
            name: tag.getAttribute("name") ?? tag.getAttribute("property"),
            content: tag.getAttribute("content")
          }))
          .filter((entry) => entry.name && entry.content)
          .reduce<Record<string, string>>((acc, entry) => {
            acc[entry.name!] = entry.content!;
            return acc;
          }, {});

        const canonical = document
          .querySelector("link[rel='canonical']")
          ?.getAttribute("href");

        const description =
          metaTags.description ??
          metaTags["og:description"] ??
          metaTags["twitter:description"] ??
          "";

        return {
          title: document.title,
          canonical,
          description,
          meta: metaTags
        };
      });

      const pageUrl = page.url();
      const normalized = new URL(pageUrl);
      const slug = slugifyUrl(normalized);

      const rawHtml = await page.content();
      const rawPath = path.join(config.outputDir, "raw", `${slug}.html`);
      await writeText(rawPath, rawHtml);

      const links = await page.evaluate((selectors) => {
        const blocked = new Set<Element>();
        for (const selector of selectors) {
          document.querySelectorAll(selector).forEach((el) => blocked.add(el));
        }

        return Array.from(document.querySelectorAll("a[href]"))
          .filter((anchor) => !blocked.has(anchor))
          .filter((anchor) => {
            const rect = anchor.getBoundingClientRect();
            const styles = window.getComputedStyle(anchor);
            const visibility =
              styles.display === "none" ||
              styles.visibility === "hidden" ||
              styles.opacity === "0";
            const offscreen = rect.bottom < 0 || rect.top > window.innerHeight * 4;
            const ariaHidden = anchor.getAttribute("aria-hidden") === "true";
            const inert = anchor.closest("[inert]") !== null;
            return !visibility && !ariaHidden && !inert && !offscreen;
          })
          .map((anchor) => anchor.getAttribute("href"))
          .filter(Boolean);
      }, config.blockedSelectors);

      const linkSet = new Set<string>();
      const childEntries: TraversalEntry[] = [];

      for (const href of links) {
        const normalizedHref = normalizeUrl(normalized, href!);
        if (!normalizedHref) continue;

        const targetUrl = new URL(normalizedHref);
        if (config.sameDomainOnly && !isSameRegistrableDomain(baseUrl, targetUrl)) {
          traversalLog.push({
            url: normalizedHref,
            depth: current.depth + 1,
            parent: current.url,
            status: "skipped",
            reason: "external-domain"
          });
          continue;
        }

        if (!linkSet.has(normalizedHref)) {
          linkSet.add(normalizedHref);
          childEntries.push({
            url: normalizedHref,
            depth: current.depth + 1,
            parent: current.url,
            status: "visited"
          });
        }
      }

      queue.push(...childEntries);

      const assetUrls = await page.evaluate(extractAssetUrls);

      const assetPaths: string[] = [];
      const pageAssetDir = createAssetPath(config.assetsDir, normalized);
      for (const asset of assetUrls) {
        const resolved = normalizeUrl(normalized, asset);
        if (!resolved) continue;

        const saved = await downloadAsset(
          resolved,
          pageAssetDir,
          config.outputDir,
          assetCache
        );
        if (saved) {
          assetPaths.push(saved);
        }
      }

      const fonts = Array.from(new Set(fontCache.values()));

      const record: PageRecord = {
        url: normalized.toString(),
        depth: current.depth,
        parent: current.parent,
        title: metadata.title,
        canonical: metadata.canonical ?? undefined,
        description: metadata.description ?? "",
        meta: metadata.meta,
        links: Array.from(linkSet),
        assets: assetPaths,
        fonts
      };

      pageRecords.set(record.url, record);
      addToSitemap(sitemapRoot, record);

    } catch (error) {
      console.error(`Failed to process ${current.url}`, error);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  await writeJson(path.join(config.outputDir, "data", "pages.json"), Array.from(pageRecords.values()));
  await writeJson(path.join(config.outputDir, "data", "traversal-log.json"), traversalLog);
  const sitemap = renderSitemap(sitemapRoot);
  await writeText(path.join(config.outputDir, "sitemap.md"), sitemap.join("\n"));

  console.log("Crawl complete");
  console.log(`Discovered ${pageRecords.size} pages`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
