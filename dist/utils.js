import fs from "node:fs/promises";
import path from "node:path";
export function normalizeUrl(base, href) {
    if (!href) {
        return null;
    }
    try {
        const url = new URL(href, base);
        if (url.hash) {
            url.hash = "";
        }
        return url.toString();
    }
    catch (error) {
        return null;
    }
}
export function isSameRegistrableDomain(target, candidate) {
    return (target.hostname === candidate.hostname ||
        candidate.hostname.endsWith(`.${target.hostname}`));
}
export function slugifyUrl(url) {
    const pathSegments = url.pathname
        .split("/")
        .filter(Boolean)
        .map((segment) => segment
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""));
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
export async function ensureDir(directory) {
    await fs.mkdir(directory, { recursive: true });
}
export function createAssetPath(assetsRoot, url) {
    const slug = slugifyUrl(url);
    return path.join(assetsRoot, slug);
}
export async function writeJson(filePath, data) {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
export async function writeText(filePath, content) {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, "utf-8");
}
export function delay(min, max) {
    const duration = Math.floor(min + Math.random() * (max - min));
    return new Promise((resolve) => setTimeout(resolve, duration));
}
