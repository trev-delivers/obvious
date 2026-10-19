#!/usr/bin/env node
/**
 * Compares two PNG screenshots: the Figma frame and the built page.
 *
 *   node compare-png.mjs figma.png built.png
 *   node compare-png.mjs figma.png built.png --diff diff.png
 *   node compare-png.mjs figma.png built.png --threshold 0.1 --max 2 --json
 *   node compare-png.mjs figma.png built.png --region 0,120,390,200
 *
 * Prints the share of pixels that differ, the horizontal bands where the
 * differences sit (so you can tell which section of the screen is off), a
 * coarse grid of the worst cells, and the size of each image. --diff writes
 * a PNG: the Figma image faded to grey with every differing pixel in red.
 *
 * How a pixel counts as different: both pixels are laid over white, turned
 * into OKLab, and compared with the HyAB distance (lightness difference plus
 * the straight-line chroma difference). Black against white scores 1. The
 * default threshold of 0.1 is the same default pixelmatch uses, which is the
 * library behind Playwright's screenshot assertions. Text edges always differ
 * a little between Figma's renderer and Chromium; look at where the bands
 * are, not only at the total.
 *
 * If one image is a whole-number multiple of the other (a 2x export against
 * a 1x page), the larger one is scaled down by averaging blocks before the
 * comparison. Any other size mismatch compares the overlapping top-left
 * area and says so.
 *
 * --region x,y,width,height compares one area of both images (after any
 * scaling), so you can check one section at a time once the rest matches.
 *
 * Exit codes: 0 compared (and under --max if given), 1 over --max, 2 could
 * not compare. Node's own modules only, so it runs anywhere Node 22 does.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync, crc32 } from "node:zlib";

/* ---------- arguments ---------- */

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const has = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};

const json = has("--json");
const diffPath = flag("--diff", null);
const threshold = Number(flag("--threshold", "0.1"));
const maxPercent = flag("--max", null);
/* A band is a run of rows where at least this share of pixels differ. 2%
   of a 390px row is about 8 pixels: enough to ignore a stray anti-aliased
   edge, small enough to catch a misplaced line of text. */
const bandRowShare = Number(flag("--band", "0.02"));
const regionArg = flag("--region", null);
const [pathA, pathB] = args;

function fail(message) {
  if (json) console.log(JSON.stringify({ error: message }));
  else console.error(`compare-png: ${message}`);
  process.exit(2);
}

if (!pathA || !pathB) fail("give two PNG files: the Figma screenshot first, then the built page.");
if (!(threshold >= 0 && threshold <= 1)) fail("--threshold must be between 0 and 1.");

/* ---------- PNG decoding ---------- */

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function decodePng(path) {
  let buf;
  try {
    buf = readFileSync(path);
  } catch (e) {
    fail(`can't read ${path} (${e.code || e.message}).`);
  }
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) {
    fail(`${path} isn't a PNG. Figma's get_screenshot and Playwright both write PNG; convert anything else first.`);
  }
  let pos = 8;
  let width, height, bitDepth, colorType, interlace;
  let palette = null;
  let paletteAlpha = null;
  const idat = [];
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + length);
    pos += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") paletteAlpha = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  if (!width) fail(`${path} has no IHDR chunk.`);
  if (interlace) fail(`${path} is interlaced. Re-save it without interlacing (most tools do this by default).`);
  if (![1, 2, 4, 8, 16].includes(bitDepth)) fail(`${path} has an unsupported bit depth (${bitDepth}).`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) fail(`${path} has an unknown colour type (${colorType}).`);
  if (colorType === 3 && !palette) fail(`${path} is a palette PNG with no palette.`);

  const raw = inflateSync(Buffer.concat(idat));
  const bitsPerPixel = channels * bitDepth;
  const bpp = Math.max(1, bitsPerPixel >> 3);
  const stride = Math.ceil((width * bitsPerPixel) / 8);
  const lines = Buffer.alloc(stride * height);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = lines.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = src[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) fail(`${path} uses an unknown row filter (${filter}).`);
      out[x] = v & 255;
    }
    prev = out;
  }

  /* Every format becomes 8-bit RGBA. */
  const rgba = new Uint8Array(width * height * 4);
  const max = (1 << bitDepth) - 1;
  const sample = (row, index) => {
    if (bitDepth === 8) return row[index];
    if (bitDepth === 16) return row[index * 2];
    const perByte = 8 / bitDepth;
    const byte = row[Math.floor(index / perByte)];
    const shift = (perByte - 1 - (index % perByte)) * bitDepth;
    return (byte >> shift) & max;
  };
  const scale = (v) => (bitDepth >= 8 ? v : Math.round((v * 255) / max));
  for (let y = 0; y < height; y++) {
    const row = lines.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const i = x * channels;
      if (colorType === 3) {
        const p = sample(row, i);
        rgba[o] = palette[p * 3];
        rgba[o + 1] = palette[p * 3 + 1];
        rgba[o + 2] = palette[p * 3 + 2];
        rgba[o + 3] = paletteAlpha && p < paletteAlpha.length ? paletteAlpha[p] : 255;
      } else if (colorType === 0 || colorType === 4) {
        const g = scale(sample(row, i));
        rgba[o] = rgba[o + 1] = rgba[o + 2] = g;
        rgba[o + 3] = colorType === 4 ? scale(sample(row, i + 1)) : 255;
      } else {
        rgba[o] = scale(sample(row, i));
        rgba[o + 1] = scale(sample(row, i + 1));
        rgba[o + 2] = scale(sample(row, i + 2));
        rgba[o + 3] = colorType === 6 ? scale(sample(row, i + 3)) : 255;
      }
    }
  }
  return { width, height, data: rgba };
}

/* ---------- PNG encoding (for --diff) ---------- */

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng({ width, height, data }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([SIGNATURE, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/* ---------- sizing ---------- */

function downscale(img, factor) {
  const width = Math.floor(img.width / factor);
  const height = Math.floor(img.height / factor);
  const data = new Uint8Array(width * height * 4);
  const n = factor * factor;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sum = [0, 0, 0, 0];
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const o = ((y * factor + dy) * img.width + (x * factor + dx)) * 4;
          for (let c = 0; c < 4; c++) sum[c] += img.data[o + c];
        }
      }
      const o = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) data[o + c] = Math.round(sum[c] / n);
    }
  }
  return { width, height, data };
}

function wholeRatio(big, small) {
  const r = big.width / small.width;
  return Number.isInteger(r) && r > 1 && Math.abs(big.height / r - small.height) <= r ? r : 0;
}

/* ---------- colour ---------- */

const toLinear = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const LINEAR = Float64Array.from({ length: 256 }, (_, i) => toLinear(i));

/* sRGB over white, then OKLab (Björn Ottosson's matrices, as CSS Color 4 uses). */
function oklab(data, o) {
  const a = data[o + 3] / 255;
  const r = LINEAR[Math.round(data[o] * a + 255 * (1 - a))];
  const g = LINEAR[Math.round(data[o + 1] * a + 255 * (1 - a))];
  const b = LINEAR[Math.round(data[o + 2] * a + 255 * (1 - a))];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/* ---------- compare ---------- */

let a = decodePng(pathA);
let b = decodePng(pathB);
const original = { figma: [a.width, a.height], built: [b.width, b.height] };
const notes = [];

if (a.width !== b.width || a.height !== b.height) {
  const ab = wholeRatio(a, b);
  const ba = wholeRatio(b, a);
  if (ab) {
    a = downscale(a, ab);
    notes.push(`The Figma image is ${ab}x the built one, so it was scaled down to compare.`);
  } else if (ba) {
    b = downscale(b, ba);
    notes.push(`The built image is ${ba}x the Figma one, so it was scaled down to compare.`);
  }
}
function crop(img, [x, y, w, h]) {
  const width = Math.max(0, Math.min(w, img.width - x));
  const height = Math.max(0, Math.min(h, img.height - y));
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    data.set(img.data.subarray(((y + row) * img.width + x) * 4, ((y + row) * img.width + x + width) * 4), row * width * 4);
  }
  return { width, height, data };
}
if (regionArg) {
  const r = regionArg.split(",").map(Number);
  if (r.length !== 4 || r.some((n) => !Number.isInteger(n) || n < 0) || !r[2] || !r[3]) {
    fail("--region takes x,y,width,height as whole numbers, like 0,120,390,200.");
  }
  a = crop(a, r);
  b = crop(b, r);
  if (!a.width || !a.height || !b.width || !b.height) fail("--region falls outside one of the images.");
  notes.push(`Only the region ${r.join(",")} was compared; y values below are inside it.`);
}
const width = Math.min(a.width, b.width);
const height = Math.min(a.height, b.height);
if (a.width !== b.width) {
  notes.push(`Widths differ (${a.width} and ${b.width}). Only the left ${width}px were compared. Capture the page at the frame's width.`);
}
if (a.height !== b.height) {
  notes.push(`Heights differ (${a.height} and ${b.height}). Only the top ${height}px were compared. The page is ${b.height > a.height ? "longer" : "shorter"} than the frame by ${Math.abs(b.height - a.height)}px.`);
}

const diffMask = new Uint8Array(width * height);
const rowCounts = new Uint32Array(height);
let differing = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const pa = oklab(a.data, (y * a.width + x) * 4);
    const pb = oklab(b.data, (y * b.width + x) * 4);
    const hyab = Math.abs(pa[0] - pb[0]) + Math.hypot(pa[1] - pb[1], pa[2] - pb[2]);
    if (hyab > threshold) {
      diffMask[y * width + x] = 1;
      rowCounts[y]++;
      differing++;
    }
  }
}
const total = width * height;
const percent = total ? (differing / total) * 100 : 0;

/* Bands: runs of rows where the share of differing pixels passes --band.
   Gaps of up to 4 rows are bridged so a line of text reads as one band. */
const bands = [];
let open = null;
for (let y = 0; y <= height; y++) {
  const hot = y < height && rowCounts[y] / width >= bandRowShare;
  if (hot) {
    if (open && y - open.end <= 5) open.end = y;
    else {
      if (open) bands.push(open);
      open = { start: y, end: y };
    }
  }
}
if (open) bands.push(open);
for (const band of bands) {
  let count = 0;
  let minX = width, maxX = -1;
  for (let y = band.start; y <= band.end; y++) {
    for (let x = 0; x < width; x++) {
      if (diffMask[y * width + x]) {
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  band.pixels = count;
  band.x = [minX, maxX];
  band.share = +((count / ((band.end - band.start + 1) * width)) * 100).toFixed(1);
}
bands.sort((p, q) => q.pixels - p.pixels);

/* Grid: cells of about 1/8 of the width, square. */
const cell = Math.max(8, Math.round(width / 8));
const cells = [];
for (let cy = 0; cy < height; cy += cell) {
  for (let cx = 0; cx < width; cx += cell) {
    let count = 0, area = 0;
    for (let y = cy; y < Math.min(cy + cell, height); y++) {
      for (let x = cx; x < Math.min(cx + cell, width); x++) {
        area++;
        count += diffMask[y * width + x];
      }
    }
    if (count) cells.push({ x: cx, y: cy, size: cell, share: +((count / area) * 100).toFixed(1) });
  }
}
cells.sort((p, q) => q.share - p.share);

if (diffPath) {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const s = (y * a.width + x) * 4;
      if (diffMask[y * width + x]) {
        out[o] = 230; out[o + 1] = 30; out[o + 2] = 40;
      } else {
        const grey = Math.round(0.299 * a.data[s] + 0.587 * a.data[s + 1] + 0.114 * a.data[s + 2]);
        const faded = Math.round(255 - (255 - grey) * 0.25);
        out[o] = out[o + 1] = out[o + 2] = faded;
      }
      out[o + 3] = 255;
    }
  }
  writeFileSync(diffPath, encodePng({ width, height, data: out }));
}

const over = maxPercent !== null && percent > Number(maxPercent);
const result = {
  compared: [width, height],
  sizes: original,
  threshold,
  differingPixels: differing,
  percent: +percent.toFixed(2),
  bands: bands.slice(0, 10).map((band) => ({ y: [band.start, band.end], x: band.x, share: band.share })),
  worstCells: cells.slice(0, 8),
  notes,
  diff: diffPath,
  overMax: over,
};

if (json) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Compared ${width} x ${height}px at threshold ${threshold}.`);
  console.log(`Figma ${original.figma.join(" x ")}, built ${original.built.join(" x ")}.`);
  for (const note of notes) console.log(`Note: ${note}`);
  console.log(`${percent.toFixed(2)}% of pixels differ (${differing} of ${total}).`);
  if (bands.length) {
    console.log("Where, biggest first (y range, x range, share of those rows):");
    for (const band of result.bands) {
      console.log(`  y ${band.y[0]} to ${band.y[1]}, x ${band.x[0]} to ${band.x[1]}, ${band.share}%`);
    }
  } else console.log("No band of rows passes the band level; differences are scattered.");
  if (diffPath) console.log(`Diff image: ${diffPath}`);
  if (over) console.log(`Over the limit of ${maxPercent}%.`);
}
process.exit(over ? 1 : 0);
