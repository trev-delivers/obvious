#!/usr/bin/env node
/**
 * Exports an HTML document to PDF at the page size its CSS asks for
 * (@page { size }), with backgrounds on, after fonts have loaded.
 *
 *   node export-pdf.mjs page.html out.pdf
 *   node export-pdf.mjs http://localhost:4321/newsletter/print/ out.pdf
 *
 * Chromium ignores @page bleed and marks, so for bleed make the page itself
 * bigger (216mm 303mm for A4 with 3mm all round). Afterwards check the PDF:
 *   pdfinfo -box out.pdf   pdffonts out.pdf   pdfimages -list out.pdf
 * Chromium swaps missing fonts silently, so pdffonts matters.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const [target, out] = process.argv.slice(2);
if (!target || !out) {
  console.error("Usage: node export-pdf.mjs <file.html|url> <out.pdf>");
  process.exit(2);
}

async function playwright() {
  try {
    return await import("playwright");
  } catch {
    const root = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
    return createRequire(`${root}/`)("playwright");
  }
}

const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(resolve(target)).href;
const { chromium } = await playwright();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.emulateMedia({ media: "print" });
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
// A family can register several faces (one per character subset); it's only a
// problem if none of them loaded.
const unloaded = await page.evaluate(() => {
  const fams = new Map();
  for (const f of document.fonts) fams.set(f.family, (fams.get(f.family) || false) || f.status === "loaded");
  return [...fams].filter(([, ok]) => !ok).map(([fam]) => fam);
});
if (unloaded.length) console.warn(`Fonts not loaded: ${unloaded.join(", ")}`);
await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await browser.close();
console.log(`Wrote ${resolve(out)}. Now run pdffonts and pdfimages -list on it.`);
