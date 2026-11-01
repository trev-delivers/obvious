#!/usr/bin/env node
/**
 * Flags the mechanical signs of machine-written copy in text, Markdown and
 * HTML, so they can be fixed before Trev reads them. It only finds what a
 * regex can find. A clean run doesn't mean the copy sounds like him: read it
 * aloud as well (see SKILL.md, "Before you hand it over").
 *
 *   node check-copy.mjs README.md index.html      # files
 *   node check-copy.mjs docs/                     # folders (.md .mdx .txt .html .htm)
 *   git log -1 --format=%B | node check-copy.mjs -   # stdin, read as plain text
 *   node check-copy.mjs --as md -                 # stdin, read as Markdown
 *   node check-copy.mjs --soft README.md          # only the strong tells
 *   node check-copy.mjs --allow color,center x.md # words this project needs
 *   node check-copy.mjs --json x.md               # machine-readable
 *
 * Exits 1 if it finds anything, 0 if not, 2 on bad arguments.
 *
 * Every finding has a level. "tell" is a strong sign (an em dash, "delve",
 * "It's not X, it's Y"). "check" is a softer one that's sometimes fine
 * ("just", a run of 3 adjectives, a number written as a word): look at it
 * and keep it if it's right. --soft reports tells only.
 *
 * Quoting bad examples on purpose (a style guide, a before and after):
 *   ~~like this~~                     Markdown strikethrough is skipped, so a
 *                                     struck-out example reads as "don't".
 *   <del>like this</del>, <s>...</s>  the same in HTML.
 *   <!-- copy-check: off --> ... <!-- copy-check: on -->
 *                                     skips the lines between. In a .txt file
 *                                     or a commit message the bare words
 *                                     "copy-check: off" and "copy-check: on"
 *                                     on their own lines do the same.
 *   <!-- copy-ok -->                  on a line skips that line, and can
 *                                     carry a note: <!-- copy-ok: his quote -->.
 *                                     In plain
 *                                     text, a line that's only "copy-ok"
 *                                     skips nothing but itself, so use the
 *                                     off/on pair there.
 *
 * Code isn't copy, so fenced code blocks, `inline code`, URLs, HTML
 * comments, <script>, <style>, <pre>, <code> and <svg> are skipped. In HTML,
 * alt, title, aria-label and placeholder attributes and meta descriptions
 * are checked, because people read those too.
 *
 * Single file, Node built-ins only, like obvious's other synced scripts.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------- word lists

/** Words with a plain swap. Matched as whole words, any case, simple plurals and tenses. */
const WORDS = {
  delve: "say what you looked at", leverage: "use", utilise: "use", utilize: "use",
  seamless: "say what it does", seamlessly: "cut it", robust: "say what makes it hold up",
  elevate: "say what changed", empower: "let, help", unlock: "get, open (or cut)",
  streamline: "simplify, cut steps", tapestry: "cut it", testament: "shows, proves",
  pivotal: "important (or cut)", vibrant: "say the colour or cut it", crucial: "important (or cut)",
  foster: "help, encourage", "game-changer": "say what changed", "cutting-edge": "new, or say what",
  showcase: "show", underscore: "show (or cut)", underscores: "shows (or cut)",
  bolster: "support, add to", garner: "get, win", intricate: "detailed",
  meticulous: "careful", meticulously: "carefully", multifaceted: "say the parts",
  interplay: "how X and Y affect each other", enduring: "lasting (or cut)",
  embark: "start", realm: "area, world (or cut)", paramount: "most important",
  holistic: "whole, all of it", synergy: "say what works together", ecosystem: "say what's in it",
  "best-in-class": "cut it", "world-class": "cut it", effortless: "say how few steps",
  effortlessly: "cut it", delightful: "cut it", "user-friendly": "say what makes it easy",
  transformative: "say what changed", revolutionise: "change", revolutionize: "change",
  harness: "use", commence: "start", facilitate: "run, help", endeavour: "try",
  plethora: "lots, a lot of", myriad: "many", nestled: "is, sits", boasts: "has",
  noteworthy: "cut it", insightful: "say what it showed", groundbreaking: "new, first",
  unparalleled: "cut it", unprecedented: "first, or say since when",
};

/** Words that are fine in their literal sense. Flagged softly. */
const LITERAL = {
  journey: "fine for a real trip; otherwise 'flow', 'steps' or cut",
  landscape: "fine for land; otherwise say which market or field",
  navigate: "fine for maps and menus; otherwise 'find your way', 'deal with'",
  key: "fine for keys and the keyboard; otherwise 'main', 'important' or cut",
  unlock: "fine for achievements and doors",
  dive: "fine for swimming",
  craft: "fine for boats and making things by hand; otherwise 'make'",
  curated: "say who chose them",
  matters: "'why it matters' and 'this matters because' are 2026 tells; say the effect",
  quietly: "a 2026 tell; cut it or say how",
  ensure: "make sure",
  enhance: "improve, or say what",
  comprehensive: "full, or say what's covered",
  valuable: "useful, or say what for",
  insights: "say what you learned",
};

/** Intensifiers and filler adverbs: usually cut, sometimes right. */
const FILLER = [
  "really", "truly", "deeply", "fundamentally", "incredibly", "simply", "just",
  "actually", "basically", "literally", "genuinely", "remarkably", "very",
  "extremely", "absolutely", "definitely", "certainly", "essentially", "arguably",
];

/** Stock phrases. [pattern, hint, level] */
const PHRASES = [
  [/\bit(?:'s| is) worth (?:noting|mentioning|pointing out)\b/i, "cut it and say the thing"],
  [/\bit(?:'s| is) important to (?:note|remember|understand)\b/i, "cut it and say the thing"],
  [/\b(?:let's|let us) (?:dive|delve|take a (?:closer )?look|break (?:it|this) down|explore|unpack)\b/i, "start with the content"],
  [/\bdeep[- ]dive\b/i, "say what you looked at"],
  [/\bdive (?:in|into)\b/i, "start with the content"],
  [/\bin today's\b/i, "cut the scene-setting"],
  [/\bfast-paced world\b/i, "cut the scene-setting"],
  [/\bever-(?:changing|evolving)\b/i, "cut it"],
  [/\bhere's the (?:thing|kicker|catch|deal|twist)\b/i, "say the thing"],
  [/\bthe (?:best|good|bad|real|short|honest) (?:part|news|answer)\?/i, "say it as a plain sentence"],
  [/\bplays? an? (?:crucial|key|vital|pivotal|important|significant) role\b/i, "say what it does"],
  [/\b(?:serves?|stands?|acts?|functions?) as an?\b/i, "use 'is'"],
  [/\ba testament to\b/i, "say what it shows"],
  [/\b(?:rich|vibrant) tapestry\b/i, "cut it"],
  [/\bwhether you're an? \w+ or an?\b/i, "say who it's for"],
  [/\blook no further\b/i, "cut it"],
  [/\b(?:i )?hope this helps\b/i, "end on the last useful fact"],
  [/\b(?:let me know|feel free to reach out|don't hesitate to)\b/i, "cut the sign-off"],
  [/\bgreat question\b/i, "cut it"],
  [/\byou're (?:absolutely|completely) right\b/i, "cut it"],
  [/\bthink of it as\b/i, "describe how it works"],
  [/\bat its (?:core|heart)\b/i, "cut it"],
  [/\bat the end of the day\b/i, "cut it"],
  [/\bmoving forward\b|\bgoing forward\b/i, "'from now on', or cut"],
  [/\bin order to\b/i, "'to'"],
  [/\b(?:in summary|in conclusion|to sum up|to summarise|to summarize|all in all|in a nutshell)\b/i, "end on the last useful fact"],
  [/(?:^|[.!?]\s+)in short\b|\bin short,/i, "end on the last useful fact"],
  [/\bthe (?:result|answer|catch|twist|kicker|secret|truth)\?\s/i, "say it as a plain sentence"],
  [/\b(?:despite|for all) (?:these|its|the) challenges\b/i, "say what went wrong and what changed"],
  [/\bthe future (?:of|is) (?:bright|here)\b/i, "cut it"],
  [/\bspeaks volumes\b|\bresonates? with\b|\bstrikes a balance\b/i, "say the plain fact"],
  [/\bmore than (?:just )?an? (?:app|tool|game|site|product|place)\b/i, "say what it is"],
  [/\bnot (?:only|just|merely|simply)\b[^.?!]{0,80}?\bbut(?: also)?\b/i, "'not just X but Y': say Y"],
  [/\bno \w+(?: \w+)?, no \w+(?: \w+)?, (?:just|only)\b/i, "'no X, no Y, just Z': say Z"],
  [/\b(?:it's not|it isn't|it is not|it wasn't|this isn't|this is not|that's not|that isn't|they're not|they aren't|we're not|we aren't)\s+(?:about\s+|just\s+)?(?:a |an |the )?[\w'-]+(?:\s[\w'-]+){0,3}[.;,]\s+(?:it's|it is|it was|this is|that's|they're|we're)\b/i,
    "'It's not X. It's Y.': say what it is"],
  [/\bnot [\w' -]{1,30}\. not [\w' -]{1,30}\./i, "'Not X. Not Y.': say what it is"],
];

/** Sentence openers that read as machine-written. */
const OPENERS = [
  "So", "Ultimately", "Additionally", "Moreover", "Furthermore", "Notably", "Importantly",
  "Crucially", "Interestingly", "Essentially", "Overall", "Indeed", "That said", "Simply put",
  "Put simply", "In essence", "Remember", "Imagine", "Picture this", "Consider", "Honestly",
  "Spoiler", "Fun fact", "Plot twist", "Truth be told", "The bottom line", "Long story short",
];

/** US spellings, with the UK form. Matched as whole words, any case. */
const US = {
  color: "colour", colors: "colours", colored: "coloured", colorful: "colourful",
  favorite: "favourite", favorites: "favourites", flavor: "flavour", flavors: "flavours",
  behavior: "behaviour", behaviors: "behaviours", honor: "honour", humor: "humour", neighbor: "neighbour",
  center: "centre", centered: "centred", centers: "centres", theater: "theatre",
  gray: "grey", catalog: "catalogue",
  organize: "organise", organized: "organised", organizing: "organising", organization: "organisation",
  realize: "realise", realized: "realised", recognize: "recognise", recognized: "recognised",
  analyze: "analyse", analyzed: "analysed", optimize: "optimise", optimized: "optimised",
  prioritize: "prioritise", customize: "customise", customized: "customised", minimize: "minimise",
  maximize: "maximise", summarize: "summarise", emphasize: "emphasise", visualize: "visualise",
  standardize: "standardise", apologize: "apologise", personalize: "personalise", finalize: "finalise",
  canceled: "cancelled", canceling: "cancelling", traveling: "travelling", traveled: "travelled",
  modeling: "modelling", labeled: "labelled", labeling: "labelling", fueled: "fuelled",
  judgment: "judgement", defense: "defence", offense: "offence", toward: "towards",
  mom: "mum", aluminum: "aluminium", artifact: "artefact (except Claude 'artifacts')",
};

/** Proper names the title-case and number-word checks leave alone. Add to it as projects need. */
const NAMES = ["The Grand Madre", "Four Horsemen", "Smuggle Brawlers", "Holy Pixels", "Morris OS",
  "Eye for Type", "Time Dissonance", "Open Door Performance", "Ground Frames Register", "Brookwood News"];
const NAMES_RE = new RegExp(`\\b(?:${NAMES.join("|")})\\b`, "gi");

const NUMBER_WORDS = ["two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "twenty", "thirty", "forty", "fifty", "hundred"];

/** Short words that stay lower case in a title-case heading. */
const SMALL = new Set(("a an and as at but by for from in into nor of on or per the to vs via " +
  "with is are be it its your our my his her their this that").split(" "));

// ------------------------------------------------------------- preprocessing

const blank = (s) => s.replace(/[^\n]/g, " ");

const ENTITIES = { "&mdash;": "—", "&ndash;": "–", "&#8212;": "—", "&#8211;": "–",
  "&#x2014;": "—", "&#x2013;": "–", "&nbsp;": " ", "&amp;": "&", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“",
  "&rdquo;": "”", "&hellip;": "…", "&rarr;": "→", "&larr;": "←", "&lt;": "<", "&gt;": ">" };
const decode = (s) => s.replace(/&[#\w]+;/g, (e) => ENTITIES[e.toLowerCase()] ?? e);

/** Lines inside copy-check: off/on markers, or holding copy-ok, become blank. */
function applyMarkers(lines) {
  // A marker counts when it's a real comment (not quoted in `backticks`) or a bare line.
  // Anything after the word in the comment is a note: <!-- copy-ok: quoting Pinker -->
  const marker = (line, word) => new RegExp(`(^|[^\`])<!--\\s*${word}\\b[^>]*-->|^\\s*${word}\\s*$`, "i").test(line);
  let off = false;
  return lines.map((line) => {
    if (marker(line, "copy-check:\\s*off")) { off = true; return ""; }
    if (marker(line, "copy-check:\\s*on")) { off = false; return ""; }
    if (off || marker(line, "copy-ok")) return "";
    return line;
  });
}

/** Markdown: returns { lines, headings: [{line, level, text}] } with code and markup blanked. */
function prepMarkdown(text) {
  let lines = applyMarkers(text.split("\n"));
  const headings = [];
  let fence = null, inComment = false, inFront = lines[0]?.trim() === "---";
  lines = lines.map((raw, i) => {
    let line = raw;
    if (inFront) { if (i > 0 && line.trim() === "---") inFront = false; return i === 0 ? "" : line.replace(/^\s*[\w-]+:\s*/, (m) => blank(m)); }
    const f = line.match(/^\s*(```|~~~)/);
    if (fence) { if (f && f[1] === fence) fence = null; return ""; }
    if (f) { fence = f[1]; return ""; }
    if (inComment) { const end = line.indexOf("-->"); if (end < 0) return ""; inComment = false; line = blank(line.slice(0, end + 3)) + line.slice(end + 3); }
    line = line.replace(/<!--[\s\S]*?-->/g, blank);
    if (/^\s{0,3}#{1,6}\s/.test(line)) line = line.replace(/<(i|cite)\b[^>]*>[\s\S]*?<\/\1>/gi, blank); // a name or title in a heading
    const open = line.indexOf("<!--");
    if (open >= 0) { inComment = true; line = line.slice(0, open); }
    line = line
      .replace(/`[^`]*`/g, blank)
      .replace(/~~[^~]+~~/g, blank)
      .replace(/<(del|s)\b[^>]*>[\s\S]*?<\/\1>/gi, blank)
      .replace(/\]\([^)]*\)/g, (m) => "]" + blank(m.slice(1)))
      .replace(/<https?:[^>]*>/g, blank)
      .replace(/\bhttps?:\/\/\S+/g, blank)
      .replace(/<\/?[a-z][^>]*>/gi, blank)
      .replace(/!\[/g, "  ");
    const h = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) headings.push({ line: i + 1, level: h[1].length, text: h[2] });
    return decode(line);
  });
  return { lines, headings };
}

/** HTML: keep line numbers, drop code and tags, keep text people read. */
function prepHtml(text) {
  let s = applyMarkers(text.split("\n")).join("\n");
  s = s.replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<(script|style|pre|code|svg|template|noscript|del|s)\b[\s\S]*?<\/\1>/gi, blank);
  const headings = [];
  s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (m, level, inner, at) => {
    const line = s.slice(0, at).split("\n").length;
    headings.push({ line, level: Number(level), text: decode(inner.replace(/<(i|cite)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim() });
    return m;
  });
  s = s.replace(/<[a-z!\/][^>]*>/gi, (tag) => {
    const keep = [];
    for (const m of tag.matchAll(/\b(alt|title|aria-label|placeholder)\s*=\s*("([^"]*)"|'([^']*)')/gi)) keep.push(m[3] ?? m[4]);
    if (/^<meta\b/i.test(tag) && /(name|property)\s*=\s*["'][^"']*(description|title)/i.test(tag)) {
      const c = tag.match(/\bcontent\s*=\s*("([^"]*)"|'([^']*)')/i);
      if (c) keep.push(c[2] ?? c[3]);
    }
    const nl = (tag.match(/\n/g) || []).length;
    return " " + keep.map((k) => k.replace(/\n/g, " ")).join(" . ") + " " + "\n".repeat(nl);
  });
  s = s.replace(/\bhttps?:\/\/\S+/g, blank);
  return { lines: decode(s).split("\n"), headings };
}

function prepText(text) {
  const lines = applyMarkers(text.split("\n")).map((l) => l.replace(/\bhttps?:\/\/\S+/g, blank).replace(/`[^`]*`/g, blank));
  return { lines, headings: [] };
}

// -------------------------------------------------------------------- checks

const wordRe = (words) => new RegExp(`\\b(${words.map((w) => w.replace(/[-]/g, "[- ]?")).join("|")})(s|es|d|ed|ing)?\\b`, "gi");
const WORD_RE = wordRe(Object.keys(WORDS));
const LITERAL_RE = wordRe(Object.keys(LITERAL));
const FILLER_RE = new RegExp(`\\b(${FILLER.join("|")})\\b`, "gi");
const US_RE = new RegExp(`\\b(${Object.keys(US).join("|")})\\b`, "gi");
const NUM_RE = new RegExp(`\\b(${NUMBER_WORDS.join("|")})\\b`, "gi");
const OPENER_RE = new RegExp(`(?:^|[.!?]["')\\]]?\\s+|^\\s*[-*+>]\\s+|^\\s*\\d+\\.\\s+)(${OPENERS.join("|")}),`, "g");
const norm = (w) => w.toLowerCase().replace(/[- ]/g, "");
const lookup = (table, w) => table[Object.keys(table).find((k) => norm(k) === norm(w))] ?? "";

function isTitleCase(text) {
  const words = text.replace(/[^\p{L}\p{N}'\s-]/gu, " ").split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  const rest = words.slice(1).filter((w) => !SMALL.has(w.toLowerCase()) && /^\p{L}/u.test(w) && !/^\p{Lu}+$/u.test(w));
  if (rest.length < 2) return false;
  const caps = rest.filter((w) => /^\p{Lu}/u.test(w)).length;
  return caps >= 2 && caps / rest.length >= 0.75;
}

/**
 * Check a string. type is "md", "html" or "text".
 * Returns [{ line, col, rule, level, match, hint }].
 */
export function checkText(text, { type = "text", allow = [], soft = false } = {}) {
  const { lines, headings } = type === "md" ? prepMarkdown(text) : type === "html" ? prepHtml(text) : prepText(text);
  const allowed = new Set(allow.map((w) => w.toLowerCase()));
  const out = [];
  const add = (line, col, rule, level, match, hint) => {
    if (soft && level !== "tell") return;
    if (allowed.has(match.toLowerCase().trim())) return;
    out.push({ line, col: col + 1, rule, level, match: match.trim(), hint });
  };
  const each = (re, line, fn) => { re.lastIndex = 0; for (const m of line.matchAll(re)) fn(m); };

  lines.forEach((line, i) => {
    const n = i + 1;
    if (!line.trim()) return;

    // Punctuation and formatting
    each(/—/g, line, (m) => add(n, m.index, "em-dash", "tell", "—", "use a full stop, comma, colon or brackets"));
    each(/–/g, line, (m) => add(n, m.index, "en-dash", "tell", "–", "for a range write 'to' (2009 to 2013); otherwise a full stop or comma"));
    each(/(?<=\S) -{1,2} (?=\S)/g, line, (m) => add(n, m.index, "spaced-hyphen", "tell", m[0], "a hyphen used as a dash: use a full stop, comma, colon or brackets"));
    each(/(?<=\w)--(?=\w)/g, line, (m) => add(n, m.index, "double-hyphen", "tell", "--", "a dash in disguise: use a full stop, comma or brackets"));
    each(/!(?![=\[(])/g, line, (m) => add(n, m.index, "exclamation", "tell", "!", "drop it; let the words do it"));
    each(/[→←⇒➔➜]/g, line, (m) => add(n, m.index, "arrow", "check", m[0], "say it in words, or use a list"));
    each(/\p{Extended_Pictographic}/gu, line, (m) => add(n, m.index, "emoji", "tell", m[0], "no emoji in copy"));
    each(/[‘’“”]/g, line, (m) => add(n, m.index, "curly-quote", "check", m[0], "straight quotes and apostrophes"));
    each(/^\s*[-*+]\s+\*\*[^*]+\*\*\s*[:.—-]/g, line, (m) => add(n, m.index, "bold-label-bullet", "tell", m[0], "a bold label then a colon: make it a sentence, a table or a plain list"));
    if (/^(?:\s*[#>*+-]\s*)*[A-Z][A-Z'&]+(?:\s+[A-Z][A-Z'&]+)+\s*$/.test(line) && line.trim().length > 4)
      add(n, line.search(/\S/), "all-caps", "tell", line.trim(), "sentence case, with no capitals for effect");

    // Words
    each(WORD_RE, line, (m) => add(n, m.index, "word", "tell", m[0], lookup(WORDS, m[1])));
    each(LITERAL_RE, line, (m) => {
      if (/^\p{Lu}/u.test(m[0]) && !/(^|[.!?:]\s+|^\s*[-*#>]\s*)$/.test(line.slice(0, m.index))) return; // a name, like ITV Craft
      add(n, m.index, "word", "check", m[0], lookup(LITERAL, m[1]));
    });
    each(FILLER_RE, line, (m) => add(n, m.index, "filler", "check", m[0], "usually cut it"));
    each(US_RE, line, (m) => add(n, m.index, "us-spelling", "tell", m[0], US[m[1].toLowerCase()]));
    each(/\b\d[\d,.]*\s?-?meters?\b/gi, line, (m) => add(n, m.index, "us-spelling", "tell", m[0], "metre (the unit). A meter that measures something is fine"));
    each(/<?\bdialogs?\b>?/gi, line, (m) => {
      if (m[0].startsWith("<") || m[0].endsWith(">")) return; // <dialog>
      const before = line.slice(0, m.index).trimEnd().split(/\s+/).pop().toLowerCase();
      const after = line.slice(m.index + m[0].length);
      if (["a", "an", "the", "one", "each", "every", "any", "modal", "this", "that", "native", "confirm", "alert"].includes(before) || /^[- ]?box/i.test(after)) return; // the UI element
      if (/[\/_.-]$/.test(line.slice(0, m.index)) || /^\.\w/.test(after)) return; // a file name: ui/dialog.ts
      add(n, m.index, "us-spelling", "tell", m[0], "dialogue for talk. 'dialog' is fine for the UI element (a dialog, dialog box)");
    });
    each(NUM_RE, line, (m) => {
      const before = line.slice(0, m.index);
      if (/(^|[.!?]\s+)$/.test(before) || /^\s*$/.test(before)) return; // starts a sentence: words are right
      if (/one or two|two or three/i.test(line.slice(Math.max(0, m.index - 8), m.index + 12))) return;
      if (/^\p{Lu}/u.test(m[0]) && /^\s+\p{Lu}/u.test(line.slice(m.index + m[0].length))) return; // a name: Four Horsemen
      const q = line.slice(0, m.index);
      if ((q.match(/"/g) || []).length % 2 === 1 || (q.match(/“/g) || []).length > (q.match(/”/g) || []).length) return; // quoted words stay as said
      for (const nm of line.matchAll(NAMES_RE)) if (m.index >= nm.index && m.index < nm.index + nm[0].length) return;
      add(n, m.index, "number-word", "check", m[0], "numerals: 2, 3, 10");
    });

    // Sentence shapes
    for (const [re, hint] of PHRASES) {
      const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
      each(g, line, (m) => add(n, m.index, "phrase", "tell", m[0], hint));
    }
    each(/(?:^|[^\w])(\w+(?: \w+){0,3})["'\u2019\u201d)\]]?, (?:not|never) (?!only\b|just\b|least\b|yet\b|all\b|that\b|even\b|so\b|because\b|to\b|if\b|when\b|unless\b|necessarily\b)["'\u2018\u201c]?(?:a |an |the )?\w+(?: \w+){0,2}["'\u2019\u201d]?(?=[.;:)!?,]|\s*[(\[]|$)/gi, line, (m) => {
      if (/\b(?:whether|if|or)\b/i.test(m[1])) return;
      add(n, m.index, "x-not-y", "tell", m[0], "'X, not Y' frames a correction nobody asked for: say X");
    });
    each(/\b(\w+(?: \w+){0,4}) rather than (\w+(?: \w+){0,3})/gi, line, (m) => add(n, m.index, "rather-than", "check", m[0], "'Y rather than X' is the 2026 cousin of 'not X but Y': often just say Y"));
    each(OPENER_RE, line, (m) => add(n, m.index + m[0].indexOf(m[1]), "opener", "tell", m[1] + ",", "start with the point"));
    each(/(?:^|[.!?]\s+)((?:\w+[’']?\w*\s){0,3}\w+)\?\s+([A-Z][^.?!]{0,60}[.!])/g, line, (m) => {
      if (m[1].split(/\s+/).length > 4) return;
      add(n, m.index, "question-answer", "check", m[0].trim(), "a question you answer yourself: say the answer");
    });
    each(/\b([a-z]{3,}), ([a-z]{3,}),? (and|or) ([a-z]{3,})\b/g, line, (m) => {
      const ws = [m[1], m[2], m[4]];
      if (ws.some((w) => SMALL.has(w) || NUMBER_WORDS.includes(w))) return;
      add(n, m.index, "rule-of-three", "check", m[0], "3 by reflex? keep the one or 2 that are true");
    });
    // Fragment stacks: "Fast. Simple. Yours."
    each(/(?:^|[.!?]\s+)((?:[A-Z][\w']*(?: [\w']+)?[.!] ){2,}[A-Z][\w']*(?: [\w']+)?[.!])(?=\s|$)/g, line, (m) =>
      add(n, m.index, "fragments", "tell", m[1], "a stack of 1 or 2 word sentences: write one sentence that says why"));
  });

  for (const h of headings) {
    if (h.level === 1) continue; // usually the thing's name
    if (isTitleCase(h.text.replace(NAMES_RE, " "))) add(h.line, 0, "title-case", "tell", h.text, "sentence case: only the first word and names take capitals");
    if (/:$/.test(h.text)) add(h.line, 0, "heading-colon", "check", h.text, "headings don't end in a colon");
  }

  const seen = new Set();
  return out.filter((f) => { const k = `${f.line}:${f.col}:${f.rule}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.line - b.line || a.col - b.col);
}

// ----------------------------------------------------------------------- CLI

const EXT = { ".md": "md", ".mdx": "md", ".markdown": "md", ".html": "html", ".htm": "html", ".txt": "text" };
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", ".next", "vendor", "coverage"]);

function walk(path, files) {
  const st = statSync(path);
  if (st.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
      walk(join(path, name), files);
    }
  } else if (EXT[extname(path).toLowerCase()]) files.push(path);
}

function main(argv) {
  const args = argv.slice(2);
  const opts = { json: false, soft: false, allow: [], as: null };
  const paths = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") opts.json = true;
    else if (a === "--soft") opts.soft = true;
    else if (a === "--allow") opts.allow.push(...(args[++i] || "").split(",").filter(Boolean));
    else if (a === "--as") opts.as = args[++i];
    else if (a === "-h" || a === "--help") { console.log(readFileSync(new URL(import.meta.url), "utf8").split("*/")[0]); return 0; }
    else if (a.startsWith("--")) { console.error(`Unknown option ${a}`); return 2; }
    else paths.push(a);
  }
  if (!paths.length) { console.error("Give it some files, a folder, or - for stdin. --help for more."); return 2; }

  const results = [];
  for (const p of paths) {
    if (p === "-") {
      results.push({ file: "stdin", findings: checkText(readFileSync(0, "utf8"), { type: opts.as || "text", allow: opts.allow, soft: opts.soft }) });
      continue;
    }
    const files = [];
    try { walk(p, files); } catch { console.error(`Can't read ${p}`); return 2; }
    for (const f of files) {
      const type = opts.as || EXT[extname(f).toLowerCase()];
      results.push({ file: relative(process.cwd(), f) || f, findings: checkText(readFileSync(f, "utf8"), { type, allow: opts.allow, soft: opts.soft }) });
    }
  }

  const total = results.reduce((t, r) => t + r.findings.length, 0);
  if (opts.json) console.log(JSON.stringify(results.filter((r) => r.findings.length), null, 2));
  else {
    for (const r of results) for (const f of r.findings)
      console.log(`${r.file}:${f.line}:${f.col}  ${f.level === "tell" ? "tell " : "check"}  ${f.rule}  "${f.match}"  ${f.hint}`);
    const tells = results.reduce((t, r) => t + r.findings.filter((f) => f.level === "tell").length, 0);
    console.log(total ? `\n${total} found (${tells} tells, ${total - tells} to check) in ${results.length} file${results.length === 1 ? "" : "s"}.`
      : `Nothing found in ${results.length} file${results.length === 1 ? "" : "s"}. Now read it aloud.`);
  }
  return total ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main(process.argv);
