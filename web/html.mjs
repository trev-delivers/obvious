/**
 * The small HTML helpers every page is written with.
 */

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A code sample with a copy button. The text is escaped here. */
export const code = (text) =>
  `<div class="code"><pre><code>${esc(text.trim())}</code></pre><button class="copy" type="button">Copy</button></div>`;

export const head = (title, lead) =>
  `<header class="page-head"><h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ""}</header>`;

export const section = (title, body, id) =>
  `<section class="sec"${id ? ` id="${id}"` : ""}><h2>${title}</h2>${body}</section>`;

export const table = (cols, rows, cls = "") =>
  `<div class="table-wrap"><table class="tokens ${cls}"><thead><tr>${cols
    .map((c) => `<th scope="col">${c}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join("")}</tr>`)
    .join("")}</tbody></table></div>`;

