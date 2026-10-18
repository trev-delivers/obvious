#!/usr/bin/env node
// List the user-facing strings in a folder of HTML, JSX, TSX and JS so a
// person can review the words without reading the code.
//
//   node strings.mjs <file-or-folder>... [options]
//
//   --flags        add a "look at" note to strings that match a common problem
//   --terms        count competing terms (sign in / log in, delete / remove...)
//   --json         print JSON instead of the readable list
//   --all          also list every other string literal that looks like prose
//   --tests        include test, spec and story files (skipped by default)
//   --ignore a,b   extra folder names to skip
//
// What it finds: text between tags in HTML and JSX (with {expressions} shown
// as placeholders), the attributes people hear or see (alt, aria-label, title,
// placeholder and the rest in ATTRS), component props that usually carry copy
// (label, hint, message... in PROP_KEYS), strings passed to toast(), alert(),
// confirm(), setError() and similar (CALLS), el.textContent = "..." and
// setAttribute("aria-label", "...") in plain JS, thrown Error messages, page
// titles and meta descriptions, and HTML written inside JS strings and
// template literals. It skips node_modules, build output, ds/, scripts/,
// .claude and test files.
//
// It is a reader, not a parser for every dialect. Strings built at run time,
// copy that lives in JSON or a CMS, and i18n keys (t("home.title")) are not
// resolved. Nothing here changes any file. Node only, no dependencies.

import fs from "node:fs";
import path from "node:path";

// Attributes whose value a person sees or hears.
const ATTRS = new Set([
  "alt", "title", "placeholder", "aria-label", "aria-description", "aria-roledescription",
  "aria-valuetext", "aria-placeholder", "aria-braillelabel", "label", "summary",
]);
// Props and object keys that usually hold copy. Kept short on purpose: a
// longer list pulls in config values.
const PROP_KEYS = new Set([
  "label", "ariaLabel", "title", "subtitle", "heading", "description", "message", "hint",
  "helperText", "helpText", "errorMessage", "error", "successMessage", "emptyText", "emptyMessage",
  "placeholder", "tooltip", "caption", "confirmLabel", "cancelLabel", "confirmText", "cancelText",
  "submitLabel", "buttonLabel", "buttonText", "cta", "body", "summary", "notice", "warning", "alt",
]);
const CALLS = /^(?:toast(?:\.\w+)?|alert|confirm|prompt|announce|notify|showToast|showError|showMessage|plainError|set(?:Error|Errors|Message|Status|Notice|Toast|Hint|Warning|Feedback|Announcement))$/;
const ERRORS = /^(?:Error|TypeError|RangeError)$/;
// el.textContent = "..." and friends, for pages written without a framework.
const ASSIGN = new Set(["textContent", "innerText", "innerHTML", "outerHTML", "title", "placeholder", "ariaLabel", "ariaDescription", "alt", "label", "ariaValueText"]);

// Elements whose text gets its own kind, so the review can apply the right rule.
const ELEMENT_KIND = {
  a: "link", button: "button", label: "label", legend: "label", option: "option", title: "page title",
  h1: "heading", h2: "heading", h3: "heading", h4: "heading", h5: "heading", h6: "heading",
  th: "table heading", caption: "caption", figcaption: "caption", summary: "button",
};
const INLINE = new Set([
  "a", "abbr", "b", "bdi", "bdo", "cite", "code", "data", "dfn", "em", "i", "kbd", "mark", "q", "s",
  "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "br", "del", "ins",
]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", ".svelte-kit", ".vercel", ".turbo",
  "coverage", "vendor", "ds", ".claude", ".agents", "playwright-report", "test-results", "scripts",
]);
const TEST_DIRS = new Set(["test", "tests", "__tests__", "e2e", "fixtures", "__mocks__", "stories"]);
const JS_EXT = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".mts", ".cts"]);
const HTML_EXT = new Set([".html", ".htm", ".vue", ".svelte", ".astro"]);
const KEYWORDS_BEFORE_EXPR = new Set([
  "return", "typeof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw",
  "instanceof", "yield", "await", "default",
]);
const NOT_CALLS = new Set(["if", "for", "while", "switch", "catch", "function", "return", "typeof", "with"]);

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "\u2019", lsquo: "\u2018", ldquo: "\u201C", rdquo: "\u201D", hellip: "\u2026", mdash: "\u2014", ndash: "\u2013", middot: "\u00B7", times: "\u00D7", copy: "\u00A9", pound: "\u00A3", euro: "\u20AC", rarr: "\u2192", larr: "\u2190", thinsp: " ", ensp: " ", emsp: " ", eacute: "\u00E9", egrave: "\u00E8", aacute: "\u00E1", agrave: "\u00E0", iacute: "\u00ED", oacute: "\u00F3", uacute: "\u00FA", ccedil: "\u00E7", ntilde: "\u00F1", auml: "\u00E4", ouml: "\u00F6", uuml: "\u00FC", szlig: "\u00DF", deg: "\u00B0", trade: "\u2122", reg: "\u00AE", bull: "\u2022", laquo: "\u00AB", raquo: "\u00BB", minus: "\u2212" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENTITIES[e.toLowerCase()] ?? m;
});
const squash = (s) => s.replace(/\s+/g, " ").trim();
const hasWords = (s) => /\p{L}/u.test(s.replace(/\{[^}]*\}/g, ""));
const looksLikeHTML = (s) => /^\s*<[a-z][\w-]*(?:[\s/>]|$)/i.test(s) || /<\/[a-z][\w-]*>/i.test(s) || /<(?:img|br|input|hr)\b[^>]*>/i.test(s);

// Prose test for strings found in code, where most literals are keys,
// classes, paths or codes. Attributes and element text skip this.
function looksLikeCopy(s, strict = false) {
  const t = s.replace(/\{[^}]*\}/g, "x").trim();
  if (!hasWords(t)) return false;
  if (/^(?:https?:|mailto:|tel:|data:|\/|\.\/|#)/.test(t)) return false;
  if (/\bfunction\s*\(|=>|;\s*[\w$]+\s*[=(.]|\bvar\s|\bconst\s/.test(t)) return false; // code
  if (/^[\w$.-]+\/[\w$./-]+$/.test(t)) return false; // a path
  if (/^[a-z][\w$]*(?:[.:-][\w$]+)+$/.test(t)) return false; // a key, event or kebab token
  if (/^[a-z]+[A-Z][\w$]*$/.test(t)) return false; // camelCase
  if (/^[A-Z0-9_]+$/.test(t) && t.includes("_")) return false; // CONSTANT_CASE
  const words = t.split(/\s+/);
  if (words.length > 1 && words.every((w) => /^[!-]?[a-z0-9]+(?:[-:/[\].%#]+[a-z0-9\]%)]*)+$/.test(w) || /^[a-z]{1,3}-?\d*$/.test(w))) return false; // utility classes
  if (strict) return words.length > 1 && /^[\p{Lu}\p{Lt}"'\u2018\u201C(]/u.test(t) || /[.?!:]$/.test(t) && words.length > 1;
  return words.length > 1 || /^\p{Lu}/u.test(t) || /[.?!]$/.test(t);
}

function lineStarts(src) { const a = [0]; for (let i = 0; i < src.length; i++) if (src[i] === "\n") a.push(i + 1); return a; }
function lineOf(starts, off) { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= off) lo = m; else hi = m - 1; } return lo + 1; }

// ---------------------------------------------------------------- JS / JSX

function scanJS(src, { jsx, emit, all = false }) {
  let i = 0, depth = 0;
  const n = src.length;
  const ctx = [];          // {kind: prop|attr|call|child|new, name, depth, elKind}
  const ternary = [];      // depths with an open "?"
  let prev = null, prev2 = null, chain = "";
  const push = (t, v) => { prev2 = prev; prev = { t, v }; };

  const exprAllowed = () => {
    if (!prev) return true;
    if (prev.t === "punc") return !/^[)\]]$/.test(prev.v);
    if (prev.t === "id") return KEYWORDS_BEFORE_EXPR.has(prev.v);
    return false;
  };
  const skipWS = () => {
    for (;;) {
      while (i < n && /\s/.test(src[i])) i++;
      if (src.startsWith("//", i)) { while (i < n && src[i] !== "\n") i++; continue; }
      if (src.startsWith("/*", i)) { const e = src.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
      return;
    }
  };
  const readQuoted = (q) => {
    const start = i; i++;
    let out = "";
    while (i < n && src[i] !== q) {
      if (src[i] === "\\") {
        const c = src[i + 1];
        out += c === "n" ? "\n" : c === "t" ? "\t" : c === "u" ? (() => { const m = /^u\{?([0-9a-fA-F]{1,6})\}?/.exec(src.slice(i + 1, i + 10)); if (m) { i += m[0].length - 1; return String.fromCodePoint(parseInt(m[1], 16)); } return "u"; })() : c === "\n" ? "" : c;
        i += 2; continue;
      }
      if (src[i] === "\n") break; // unterminated: stop at the line end
      out += src[i++];
    }
    i++;
    return { text: out, start };
  };
  // A template literal. ${...} becomes {expr} (or {...} when long) so the
  // string still reads as a sentence. segs maps text offsets to file offsets.
  const readTemplate = () => {
    const start = i; i++;
    let text = ""; const segs = [{ local: 0, file: i }];
    while (i < n && src[i] !== "`") {
      if (src[i] === "\\") { text += src[i + 1] === "`" || src[i + 1] === "$" ? src[i + 1] : src.slice(i, i + 2); i += 2; continue; }
      if (src[i] === "$" && src[i + 1] === "{") {
        const exprStart = i + 2;
        i += 2; depth++;
        ctx.push({ kind: "tplexpr", depth });
        scan("}");
        ctx.pop(); depth--;
        const expr = squash(src.slice(exprStart, i - 1));
        const ph = expr.length <= 24 && !/[<>"'`{}]/.test(expr) ? `{${expr}}` : "{\u2026}";
        segs.push({ local: text.length, file: exprStart - 2, ph: true });
        text += ph;
        segs.push({ local: text.length, file: i });
        continue;
      }
      text += src[i++];
    }
    i++;
    return { text, start, segs };
  };
  const mapper = (segs) => (local) => { let s = segs[0]; for (const g of segs) { if (g.local <= local) s = g; else break; } return s.ph ? s.file : s.file + (local - s.local); };

  const onString = (text, start, map, isTpl) => {
    if (looksLikeHTML(text)) { scanHTML(text, { emit, map, all }); return; }
    const top = ctx[ctx.length - 1];
    let kind = null, ok = false;
    if (top && top.depth === depth) {
      if (top.kind === "attr" && (ATTRS.has(top.name) || PROP_KEYS.has(top.name))) { kind = top.name; ok = top.name === "alt" || hasWords(text); }
      else if (top.kind === "prop" && PROP_KEYS.has(top.name)) { kind = "prop " + top.name; ok = looksLikeCopy(text); }
      else if (top.kind === "call" && CALLS.test(top.name)) { kind = top.name + "()"; ok = looksLikeCopy(text); }
      else if (top.kind === "call" && /(?:^|\.)setAttribute$/.test(top.name) && top.arg === 1 && ATTRS.has(top.first)) { kind = top.first; ok = top.first === "alt" || hasWords(text); }
      else if (top.kind === "assign") { kind = top.name; ok = /^(?:textContent|innerText|innerHTML|outerHTML)$/.test(top.name) ? looksLikeCopy(text) : hasWords(text); }
      else if (top.kind === "new" && ERRORS.test(top.name)) { kind = "thrown error"; ok = looksLikeCopy(text); }
      else if (top.kind === "child") { kind = top.elKind; ok = looksLikeCopy(text); }
    }
    if (top && top.kind === "call" && top.depth === depth && top.arg === 0) top.first = text;
    if (!kind && all) { kind = isTpl ? "template" : "string"; ok = looksLikeCopy(text, true); }
    if (!ok) return;
    // Joined with + to other text: a localisation problem worth seeing.
    const save = i; skipWS(); const next = src[i], next2 = src[i + 1]; i = save;
    const concat = (prev && prev.v === "+") || (next === "+" && next2 !== "+" && next2 !== "=");
    emit({ off: start, kind, text: squash(text), concat });
  };

  // Returns true if "<" here starts a JSX element.
  const jsxStarts = () => {
    if (!jsx || !exprAllowed()) return false;
    const m = /^<\s*(>|[A-Za-z_$][\w$.:-]*)/.exec(src.slice(i, i + 200));
    if (!m) return false;
    if (m[1] === ">") return true;
    const after = src.slice(i + m[0].length, i + m[0].length + 40);
    if (/^\s*(,|extends\b)/.test(after)) return false; // a TS generic arrow function
    return true;
  };

  // JSX element. run collects the sentence this element sits in.
  const parseJSX = (run, elKind) => {
    i++; skipWS();
    let name = "";
    if (src[i] !== ">") { const m = /^[A-Za-z_$][\w$.:-]*/.exec(src.slice(i, i + 200)); name = m ? m[0] : ""; i += name.length; }
    if (src[i] === "<") { let d = 0; do { if (src[i] === "<") d++; else if (src[i] === ">") d--; i++; } while (i < n && d > 0); } // <Tabs<View> ...>
    let self = false;
    const tagStart = i, seenAttrs = new Set();
    for (let guard = 0; i < n && guard < 10000; guard++) {
      skipWS();
      if (src[i] === "/" && src[i + 1] === ">") { i += 2; self = true; break; }
      if (src[i] === ">") { i++; break; }
      if (src[i] === "{") { seenAttrs.add("..."); i++; depth++; ctx.push({ kind: "spread", depth }); scan("}"); ctx.pop(); depth--; continue; }
      const m = /^[\w$:.-]+/.exec(src.slice(i, i + 100));
      if (!m) { i++; continue; }
      const attr = m[0]; i += attr.length; skipWS(); seenAttrs.add(attr);
      if (src[i] !== "=") continue;
      i++; skipWS();
      if (src[i] === '"' || src[i] === "'") {
        const q = src[i], s = i; const e = src.indexOf(q, i + 1); i = e < 0 ? n : e + 1;
        const val = decode(src.slice(s + 1, e < 0 ? n : e));
        if ((ATTRS.has(attr) || PROP_KEYS.has(attr)) && (attr === "alt" || hasWords(val))) emit({ off: s, kind: attr, text: squash(val) });
      } else if (src[i] === "{") {
        i++; depth++; ctx.push({ kind: "attr", name: attr, depth }); prev = { t: "punc", v: "{" };
        scan("}"); ctx.pop(); depth--;
      } else if (src[i] === "<") { parseJSX(null, elKind); }
    }
    if (name === "img" && !seenAttrs.has("alt") && !seenAttrs.has("aria-hidden") && !seenAttrs.has("role") && !seenAttrs.has("...")) emit({ off: tagStart, kind: "alt", text: "", missing: true });
    if (self) return { text: "", listed: false };
    const lower = name.toLowerCase();
    const myKind = ELEMENT_KIND[name] || (/Button$|^Btn$/.test(name) ? "button" : /Link$/.test(name) ? "link" : /Label$/.test(name) ? "label" : /^(?:Heading|Title)$/.test(name) ? "heading" : null) || elKind || "text";
    const inline = INLINE.has(name) || (run && /^(?:Link|Trans)$/.test(name));
    const own = { parts: [], start: i, kind: myKind, hasOwn: false, hasChild: false };
    const flush = (r) => { const t = squash(r.parts.join("")); if (hasWords(t) && (r.hasOwn || !r.hasChild)) emit({ off: r.start, kind: r.kind, text: t }); r.parts = []; };
    for (let guard = 0; i < n && guard < 100000; guard++) {
      if (src[i] === "<") {
        if (src[i + 1] === "/") { const e = src.indexOf(">", i); i = e < 0 ? n : e + 1; break; }
        const child = parseJSX(own, myKind);
        if (child !== null) { own.parts.push(child.text); if (child.listed) own.hasChild = true; else if (hasWords(child.text)) own.hasOwn = true; }
        continue;
      }
      if (src[i] === "{") {
        const s = i; i++; depth++;
        ctx.push({ kind: "child", depth, elKind: myKind }); prev = { t: "punc", v: "{" };
        scan("}"); ctx.pop(); depth--;
        const expr = squash(src.slice(s + 1, i - 1));
        if (!expr || expr.startsWith("/*")) continue;
        if (/^(['"]).*\1$/.test(expr)) { const lit = expr.slice(1, -1); own.parts.push(lit); if (hasWords(lit)) own.hasOwn = true; continue; }
        const ph = expr.length <= 24 && !/[<>"'`{}]/.test(expr) ? `{${expr}}` : "{\u2026}";
        own.parts.push(ph); own.hasOwn = true;
        continue;
      }
      const s = i; while (i < n && src[i] !== "<" && src[i] !== "{") i++;
      const t = decode(src.slice(s, i)); own.parts.push(t); if (hasWords(t)) own.hasOwn = true;
      if (own.parts.length === 1 && !/\S/.test(t)) own.start = i;
    }
    if (inline && run) {
      // Inline: the text belongs to the sentence around it. Links and buttons
      // are also listed on their own so their wording can be checked.
      const listed = myKind !== elKind && /link|button|label/.test(myKind);
      if (listed) flush({ ...own, hasOwn: true });
      return { text: own.parts.join(""), listed };
    }
    flush(own);
    return null;
  };

  // Main loop. Stops at the matching "}" when stop is "}".
  function scan(stop) {
    const startDepth = depth;
    for (let guard = 0; i < n && guard < 5000000; guard++) {
      const before = i; skipWS();
      if (i >= n) return;
      // A line break after a complete value usually ends the statement.
      if (prev && (["str", "id", "num"].includes(prev.t) || prev.v === ")" || prev.v === "]") && src.slice(before, i).includes("\n")) {
        while (ctx.length && ctx[ctx.length - 1].depth === depth && ctx[ctx.length - 1].kind === "assign") ctx.pop();
      }
      const c = src[i];
      if (c === '"' || c === "'") { const r = readQuoted(c); onString(r.text, r.start, (x) => r.start + 1 + x, false); push("str", r.text); continue; }
      if (c === "`") { const r = readTemplate(); onString(r.text, r.start, mapper(r.segs), true); push("str", r.text); continue; }
      if (c === "<" && jsxStarts()) { parseJSX(null, null); push("jsx", ""); continue; }
      if (c === "/" && exprAllowed()) { // regex literal
        i++; let cls = false;
        while (i < n && src[i] !== "\n") { if (src[i] === "\\") { i += 2; continue; } if (src[i] === "[") cls = true; else if (src[i] === "]") cls = false; else if (src[i] === "/" && !cls) break; i++; }
        i++; while (i < n && /[a-z]/i.test(src[i])) i++;
        push("regex", ""); continue;
      }
      if (/[A-Za-z_$\u00C0-\uFFFF]/.test(c)) {
        const m = /^[\w$\u00C0-\uFFFF]+/.exec(src.slice(i, i + 200)); i += m[0].length;
        chain = prev && (prev.v === "." || prev.v === "?.") && chain ? chain + "." + m[0] : m[0];
        push("id", m[0]); continue;
      }
      if (/[0-9]/.test(c)) { const m = /^[0-9][\w.]*/.exec(src.slice(i, i + 100)); i += m[0].length; push("num", m[0]); continue; }
      const op = /^(?:=>|\?\?=?|\?\.|&&=?|\|\|=?|\.\.\.|[-+*%=!<>&|^~?:;,.()[\]{}@#\\])/.exec(src.slice(i, i + 4));
      const v = op ? op[0] : c; i += v.length;
      if (v === "(" || v === "[" || v === "{") {
        const callName = v === "(" && prev && prev.t === "id" && !NOT_CALLS.has(prev.v) ? chain : null;
        const isNew = callName && prev2 && prev2.v === "new";
        depth++;
        if (callName) ctx.push({ kind: isNew ? "new" : "call", name: callName, depth, arg: 0 });
      } else if (v === ")" || v === "]" || v === "}") {
        if (v === "}" && stop === "}" && depth === startDepth) return;
        depth--;
        while (ctx.length && ctx[ctx.length - 1].depth > depth && !["tplexpr", "attr", "child", "spread"].includes(ctx[ctx.length - 1].kind)) ctx.pop();
        while (ternary.length && ternary[ternary.length - 1] > depth) ternary.pop();
      } else if (v === "?") { ternary.push(depth); }
      else if (v === ":") {
        if (ternary.length && ternary[ternary.length - 1] === depth) ternary.pop();
        else if (prev && (prev.t === "id" || prev.t === "str") && !(prev2 && prev2.v === "case")) {
          while (ctx.length && ctx[ctx.length - 1].depth === depth && ctx[ctx.length - 1].kind === "prop") ctx.pop();
          ctx.push({ kind: "prop", name: prev.v, depth });
        }
      } else if (v === "," || v === ";") {
        while (ctx.length && ctx[ctx.length - 1].depth === depth && (ctx[ctx.length - 1].kind === "prop" || ctx[ctx.length - 1].kind === "assign")) ctx.pop();
        const t = ctx[ctx.length - 1];
        if (v === "," && t && t.kind === "call" && t.depth === depth) t.arg++;
      } else if ((v === "=" || v === "+") && prev && prev.t === "id" && ASSIGN.has(prev.v) && prev2 && (prev2.v === "." || prev2.v === "?.") && src[i] !== "=") {
        ctx.push({ kind: "assign", name: prev.v, depth });
      }
      push("punc", v);
    }
  }
  scan(null);
}

// ---------------------------------------------------------------- HTML

function scanHTML(html, { emit, map = (x) => x, all = false }) {
  let i = 0; const n = html.length;
  const stack = [{ name: "#root", kind: "text", run: { parts: [], start: 0, kind: "text" } }];
  const flush = (run) => { const t = squash(run.parts.join("")); if (hasWords(t) && (run.hasOwn || !run.hasChild)) emit({ off: map(run.start), kind: run.kind, text: t }); run.parts = []; run.hasOwn = run.hasChild = false; };
  const top = () => stack[stack.length - 1];
  while (i < n) {
    if (html.startsWith("<!--", i)) { const e = html.indexOf("-->", i); i = e < 0 ? n : e + 3; continue; }
    if (html.startsWith("<!", i) || html.startsWith("<?", i)) { const e = html.indexOf(">", i); i = e < 0 ? n : e + 1; continue; }
    if (html[i] === "<" && html[i + 1] === "/") {
      const m = /^<\/\s*([\w:-]+)[^>]*>?/.exec(html.slice(i, i + 200));
      i += m ? m[0].length : 2;
      const name = m ? m[1].toLowerCase() : "";
      const at = stack.map((s) => s.name).lastIndexOf(name);
      if (at > 0) {
        while (stack.length > at) {
          const el = stack.pop();
          const text = el.run.parts.join("");
          if (el.inline) {
            const listed = /link|button|label/.test(el.kind) && el.kind !== top().kind;
            if (listed) flush({ ...el.run, hasOwn: true });
            top().run.parts.push(text);
            if (listed) top().run.hasChild = true; else if (hasWords(text)) top().run.hasOwn = true;
          } else { flush(el.run); top().run.start = i; }
        }
      }
      continue;
    }
    if (html[i] === "<" && /[A-Za-z]/.test(html[i + 1] || "")) {
      const start = i;
      const nm = /^<([\w:-]+)/.exec(html.slice(i, i + 100)); const name = nm[1].toLowerCase(); i += nm[0].length;
      const attrs = {};
      let self = false, closed = false;
      for (let guard = 0; i < n && guard < 5000; guard++) {
        while (i < n && /\s/.test(html[i])) i++;
        if (html[i] === ">") { i++; closed = true; break; }
        if (html[i] === "/" && html[i + 1] === ">") { i += 2; self = closed = true; break; }
        const a = /^[^\s=>\/]+/.exec(html.slice(i, i + 200));
        if (!a) { i++; continue; }
        const an = a[0].toLowerCase(); const aStart = i; i += a[0].length;
        while (i < n && /\s/.test(html[i])) i++;
        let val = null;
        if (html[i] === "=") {
          i++; while (i < n && /\s/.test(html[i])) i++;
          if (html[i] === '"' || html[i] === "'") { const q = html[i]; const e = html.indexOf(q, i + 1); val = html.slice(i + 1, e < 0 ? n : e); i = e < 0 ? n : e + 1; }
          else { const v = /^[^\s>]+/.exec(html.slice(i)); val = v ? v[0] : ""; i += val.length; }
        }
        attrs[an] = { val: val === null ? null : decode(val), off: aStart };
      }
      for (const [an, { val, off }] of Object.entries(attrs)) {
        if (val === null) continue;
        if (ATTRS.has(an) && (an === "alt" || hasWords(val))) emit({ off: map(off), kind: an, text: squash(val) });
      }
      if (name === "meta" && attrs.content) {
        const key = (attrs.name?.val || attrs.property?.val || "").toLowerCase();
        if (/^(?:description|og:title|og:description|twitter:title|twitter:description|application-name|apple-mobile-web-app-title)$/.test(key)) emit({ off: map(attrs.content.off), kind: "meta " + key, text: squash(attrs.content.val) });
      }
      if (name === "input" && attrs.value && /^(?:submit|button|reset)$/i.test(attrs.type?.val || "")) emit({ off: map(attrs.value.off), kind: "button", text: squash(attrs.value.val) });
      if (name === "img" && closed && !attrs.alt && !/aria-hidden|role/.test(Object.keys(attrs).join(" "))) emit({ off: map(start), kind: "alt", text: "", missing: true });
      if (name === "script" || name === "style" || name === "pre") {
        const close = html.toLowerCase().indexOf("</" + name, i);
        const end = close < 0 ? n : close;
        const type = (attrs.type?.val || "").toLowerCase();
        const off0 = i;
        if (name === "script" && (!type || /javascript|module/.test(type))) scanJS(html.slice(i, end), { jsx: false, all, emit: (e) => emit({ ...e, off: map(off0 + e.off) }) });
        const gt = html.indexOf(">", end); i = close < 0 ? n : (gt < 0 ? n : gt + 1);
        continue;
      }
      if (name === "br" || name === "wbr") { top().run.parts.push(name === "br" ? " " : ""); continue; }
      if (self || VOID.has(name)) continue;
      const kind = ELEMENT_KIND[name] || top().kind;
      const inline = INLINE.has(name);
      if (!inline) { flush(top().run); }
      stack.push({ name, kind, inline, run: { parts: [], start: i, kind } });
      continue;
    }
    const s = i; i++; while (i < n && html[i] !== "<") i++;
    const run = top().run;
    if (!run.parts.length && !/\S/.test(html.slice(s, i))) { run.start = i; continue; }
    if (!run.parts.length) run.start = s + (html.slice(s, i).length - html.slice(s, i).trimStart().length);
    const t = decode(html.slice(s, i));
    run.parts.push(t);
    if (hasWords(t)) run.hasOwn = true;
  }
  while (stack.length) flush(stack.pop().run);
}

// ---------------------------------------------------------------- flags

const FLAG_RULES = [
  ["dash", "em or en dash", (e) => /[\u2013\u2014]/.test(e.text)],
  ["vague link", "link text that doesn't say where it goes", (e) => e.kind === "link" && /^(?:click here|here|this|link|more|read more|learn more|find out more|see more|details|go|continue reading)\.?$/i.test(e.text)],
  ["generic button", "button that could name its action", (e) => /button|confirmLabel|submitLabel|buttonText|buttonLabel/.test(e.kind) && /^(?:ok|okay|yes|no|submit|go|click here|done!?)$/i.test(e.text)],
  ["long button", "button over 4 words", (e) => e.kind === "button" && e.text.split(/\s+/).length > 4],
  ["interjection", "oops, whoops, uh oh", (e) => /\b(?:oops|whoops|uh[- ]oh|yikes|oh no)\b/i.test(e.text)],
  ["blame word", "invalid, illegal, forbidden, wrong, failed to", (e) => /\b(?:invalid|illegal|forbidden|prohibited|you forgot|you failed|incorrect)\b/i.test(e.text)],
  ["vague error", "says something went wrong without saying what", (e) => /^(?:an? (?:unknown |unexpected )?error(?: occurred| has occurred)?|something went wrong|error)\.?!?$/i.test(e.text)],
  ["please or sorry", "please or sorry (check the voice guide)", (e) => /\b(?:please|sorry)\b/i.test(e.text)],
  ["middle dot", "a middle dot joining bits of metadata", (e) => /\s\u00B7\s|^\u00B7\s/.test(e.text)],
  ["exclamation", "exclamation mark", (e) => /!/.test(e.text.replace(/!=/g, ""))],
  ["capitals", "whole string in capitals", (e) => { const l = e.text.replace(/[^\p{L}]/gu, ""); return l.length > 3 && l === l.toUpperCase() && l !== l.toLowerCase(); }],
  ["title case", "Title Case (most guides use sentence case)", (e) => { const w = e.text.replace(/\{[^}]*\}/g, "").split(/\s+/).filter((x) => /^\p{L}/u.test(x) && x.length > 3); return w.length >= 3 && w.every((x) => /^\p{Lu}\p{Ll}/u.test(x)); }],
  ["device verb", "click, tap or hover (only right on one kind of device)", (e) => /\b(?:click|tap|hover|double-click|right-click)\b/i.test(e.text)],
  ["position or colour", "points at a place or colour on screen", (e) => /\b(?:above|below|left|right|top|bottom|red|green|blue)\b[^.]{0,20}\b(?:button|link|icon|menu|box|field)\b/i.test(e.text)],
  ["alt missing", "img with no alt attribute", (e) => e.missing],
  ["alt filename", "alt text that is a file name", (e) => e.kind === "alt" && /(?:\.(?:png|jpe?g|gif|svg|webp|avif)$|^(?:img|image|dsc|screenshot)[-_ ]?\d+)/i.test(e.text)],
  ["alt says image", "alt starting with image of, picture of", (e) => e.kind === "alt" && /^(?:an? )?(?:image|picture|photo|graphic|icon) of\b/i.test(e.text)],
  ["role in name", "accessible name includes the role", (e) => /^(?:aria-label|ariaLabel|label)$/.test(e.kind) && /\b(?:button|link|icon|image)$/i.test(e.text)],
  ["long sentence", "a sentence over 25 words", (e) => e.text.split(/(?<=[.?!])\s+/).some((s) => s.split(/\s+/).length > 25)],
  ["placeholder only?", "placeholder text: check there is also a visible label", (e) => e.kind === "placeholder"],
  ["joined with +", "built by joining strings, which breaks translation", (e) => e.concat],
];
const TERM_SETS = [
  ["sign in", "log in", "login", "logon"], ["sign out", "log out", "logout"], ["sign up", "register", "create account", "create an account"],
  ["email", "e-mail"], ["delete", "remove", "trash"], ["settings", "preferences", "options"], ["cancel", "discard", "dismiss"],
  ["ok", "okay"], ["username", "user name"], ["log", "history"], ["save", "keep"], ["edit", "change", "modify"], ["search", "find"],
];

// ---------------------------------------------------------------- files

function walk(target, opts, out) {
  let st; try { st = fs.statSync(target); } catch { process.stderr.write(`Can't read ${target}\n`); return; }
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(target).sort()) {
      if (SKIP_DIRS.has(name) || opts.ignore.has(name)) continue;
      if (!opts.tests && TEST_DIRS.has(name)) continue;
      walk(path.join(target, name), opts, out);
    }
    return;
  }
  const ext = path.extname(target).toLowerCase();
  if (!JS_EXT.has(ext) && !HTML_EXT.has(ext)) return;
  if (/\.d\.ts$|\.min\.js$/.test(target)) return;
  if (!opts.tests && /\.(?:test|spec|stories|e2e)\.[cm]?[jt]sx?$/.test(target)) return;
  out.push(target);
}

function extract(file, opts) {
  const src = fs.readFileSync(file, "utf8");
  if (src.length > 2_000_000 || src.split("\n").some((l) => l.length > 5000)) return { file, entries: [], note: "skipped: looks minified or generated" };
  const starts = lineStarts(src);
  const entries = []; const seen = new Set();
  const emit = (e) => { const key = e.off + "|" + e.kind + "|" + e.text; if (seen.has(key)) return; seen.add(key); entries.push({ line: lineOf(starts, e.off), kind: e.kind, text: e.text, ...(e.concat ? { concat: true } : {}), ...(e.missing ? { missing: true } : {}) }); };
  const ext = path.extname(file).toLowerCase();
  let note;
  try {
    if (HTML_EXT.has(ext)) scanHTML(src, { emit, all: opts.all });
    else scanJS(src, { jsx: !/\.[cm]?ts$/.test(ext), emit, all: opts.all });
  } catch (err) { note = "partly read: " + err.message; }
  entries.sort((a, b) => a.line - b.line);
  return { file, entries, note };
}

function main(argv) {
  const opts = { flags: false, terms: false, json: false, all: false, tests: false, ignore: new Set() };
  const targets = [];
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === "--flags") opts.flags = true; else if (a === "--terms") opts.terms = true;
    else if (a === "--json") opts.json = true; else if (a === "--all") opts.all = true;
    else if (a === "--tests") opts.tests = true;
    else if (a === "--ignore") (argv[++k] || "").split(",").filter(Boolean).forEach((x) => opts.ignore.add(x));
    else if (a === "-h" || a === "--help") { process.stdout.write(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1).filter((l, k, a) => a.slice(0, k + 1).every((x) => x.startsWith("//"))).map((l) => l.replace(/^\/\/ ?/, "")).join("\n") + "\n"); return 0; }
    else targets.push(a);
  }
  if (!targets.length) { process.stderr.write("Usage: node strings.mjs <file-or-folder>... [--flags] [--terms] [--json] [--all] [--tests] [--ignore a,b]\n"); return 2; }
  const files = []; let missing = 0;
  for (const t of targets) { if (!fs.existsSync(t)) { process.stderr.write(`Can't find ${t}\n`); missing++; continue; } walk(t, opts, files); }
  if (missing === targets.length) return 1;
  const results = files.map((f) => extract(f, opts));
  const cwd = process.cwd();
  for (const r of results) for (const e of r.entries) if (opts.flags) { const f = FLAG_RULES.filter(([, , test]) => test(e)).map(([id]) => id); if (f.length) e.flags = f; }

  let terms = null;
  if (opts.terms) {
    terms = [];
    const all = results.flatMap((r) => r.entries.map((e) => ({ ...e, file: r.file })));
    for (const set of TERM_SETS) {
      const found = set.map((term) => {
        const re = new RegExp(`(?<![\\p{L}-])${term.replace(/ /g, "[ -]?")}(?![\\p{L}-])`, "iu");
        const hits = all.filter((e) => re.test(e.text));
        return { term, count: hits.length, example: hits[0] ? `${path.relative(cwd, hits[0].file)}:${hits[0].line}` : null };
      }).filter((x) => x.count);
      if (found.length > 1) terms.push(found);
    }
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({ files: results.map((r) => ({ file: path.relative(cwd, r.file), note: r.note, entries: r.entries })), terms }, null, 2) + "\n");
    return 0;
  }
  let total = 0, flagged = 0; const byKind = {};
  for (const r of results) {
    if (!r.entries.length && !r.note) continue;
    process.stdout.write(`\n${path.relative(cwd, r.file)}${r.note ? `  (${r.note})` : ""}\n`);
    for (const e of r.entries) {
      total++; byKind[e.kind] = (byKind[e.kind] || 0) + 1;
      if (e.flags) flagged++;
      const text = e.missing ? "(no alt attribute)" : e.text === "" ? "(empty)" : e.text;
      process.stdout.write(`  ${String(e.line).padStart(5)}  ${e.kind.padEnd(14)} ${text}${e.flags ? `   [look at: ${e.flags.join(", ")}]` : ""}\n`);
    }
  }
  process.stdout.write(`\n${total} strings in ${results.filter((r) => r.entries.length).length} of ${results.length} files.`);
  if (opts.flags) process.stdout.write(` ${flagged} have a note to look at. A note is a prompt to read the string, not a verdict.`);
  process.stdout.write("\n");
  const kinds = Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ");
  if (kinds) process.stdout.write(`By kind: ${kinds}\n`);
  if (terms) {
    process.stdout.write(terms.length ? "\nCompeting terms (pick one per idea, unless they mean different things):\n" : "\nNo competing terms from the built-in list.\n");
    for (const set of terms) process.stdout.write("  " + set.map((t) => `"${t.term}" ${t.count} (${t.example})`).join("  vs  ") + "\n");
  }
  return 0;
}

// Piping into head closes stdout early; that is not an error.
process.stdout.on("error", (err) => { if (err.code === "EPIPE") process.exit(0); throw err; });
process.exitCode = main(process.argv.slice(2));
