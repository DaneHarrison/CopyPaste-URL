import fs from "node:fs/promises";
import path from "node:path";

export type PageRecord = {
  url: string;
  depth: number;
  parent?: string;
  title?: string;
  canonical?: string;
  description?: string;
  meta: Record<string, string>;
  links: string[];
  assets: string[];
  fonts: string[];
  screenshotPath?: string;
};

export function normalizeUrl(base: URL, href: string): string | null {
  if (!href) {
    return null;
  }

  try {
    const url = new URL(href, base);
    if (url.hash) {
      url.hash = "";
    }
    return url.toString();
  } catch (error) {
    return null;
  }
}

export function isSameRegistrableDomain(target: URL, candidate: URL): boolean {
  return (
    target.hostname === candidate.hostname ||
    candidate.hostname.endsWith(`.${target.hostname}`)
  );
}

export function slugifyUrl(url: URL): string {
  const pathSegments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );

  const slug = pathSegments.length > 0 ? pathSegments.join("-") : "home";
  if (!url.search) {
    return slug;
  }

  const queryPart = url.search
    .replace(/^\?/, "")
    .split("&")
    .map((pair) => pair.split("=")[0])
    .join("-");

  return `${slug}-${queryPart}`;
}

export async function ensureDir(directory: string): Promise<void> {
  await fs.mkdir(directory, { recursive: true });
}

export function createAssetPath(assetsRoot: string, url: URL): string {
  const slug = slugifyUrl(url);
  return path.join(assetsRoot, slug);
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function writeText(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf-8");
}

export function delay(min: number, max: number): Promise<void> {
  const duration = Math.floor(min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, duration));
}
