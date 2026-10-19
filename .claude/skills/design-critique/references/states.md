# Making states and flows appear

A state you haven't seen isn't reviewed. These are the ways to produce each
one. Prefer the app's own fixtures or fake backend if it has them (check
its README and test folder); fall back to the techniques here.

## Contents

1. Flows with `--steps`
2. A scratch Playwright script
3. Empty
4. Loading and slow
5. Error
6. Long content and partial data
7. First use and signed out
8. Offline
9. What to write down

## 1. Flows with `--steps`

For clicking through a task, the capture script is enough. Write the steps
to a JSON file in your scratchpad:

```json
[
  { "click": "role=button[name='Add item']" },
  { "shot": "sheet-open" },
  { "fill": ["#name", "Oat milk"] },
  { "click": "text=Save" },
  { "wait": 400 },
  { "shot": "after-save" },
  { "press": "Escape" },
  { "goto": "/list" },
  { "shot": "list" }
]
```

```sh
node <skill folder>/scripts/capture.mjs http://localhost:4353/ \
  --steps <scratchpad>/steps.json --out <scratchpad>/crit-flow
```

Step kinds: `click`, `fill` [selector, text], `press` (a key name),
`hover`, `goto` (a path), `wait` (ms), `shot` (a name). Selectors are
Playwright's: CSS, `text=`, or `role=button[name='...']`. The run stops at
the first failed step and prints which one; a step that fails because the
control can't be found or reached is often a finding in itself (hidden on
phones, covered by something, no accessible name).

Never submit anything real: no live payments, messages or writes to a real
database. Use the app's fake backend or intercept the request (section 5).

## 2. A scratch Playwright script

For anything `--steps` can't do, write a short script in the scratchpad.
Load Playwright the same way the capture script does, so nothing gets
installed:

```js
// <scratchpad>/state.mjs, run with: node <scratchpad>/state.mjs
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const root = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
let pw;
try { pw = createRequire(process.cwd() + "/package.json")("playwright"); }
catch { pw = createRequire(root + "/x.js")("playwright"); }

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
// ...set up the state here (sections 3 to 8)...
await page.goto("http://localhost:4353/");
await page.screenshot({ path: "<scratchpad>/crit/state-name.png" });
await browser.close();
```

Never run `playwright install`. If Chromium isn't at that path (CI, another
machine), leave `executablePath` out.

## 3. Empty

- Intercept the data request and return nothing. Find its URL in the
  browser's network log or the app's fetch calls:

  ```js
  await page.route("**/api/items*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  ```

- For apps that keep data in the browser, a fresh context starts empty
  (section 7).
- Check: does it say what goes here and offer the action that fills it?

## 4. Loading and slow

- `--early` on the capture script shoots the page at DOMContentLoaded.
- To hold a request open long enough to see the loading state:

  ```js
  await page.route("**/api/items*", async (r) => {
    await new Promise((ok) => setTimeout(ok, 4000));
    await r.continue();
  });
  await page.goto(url, { waitUntil: "commit" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: ".../loading.png" });
  ```

- Whole-page slow network, through Chromium's DevTools protocol:

  ```js
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false, latency: 400, downloadThroughput: 50000, uploadThroughput: 20000 });
  ```

- Check: skeleton or spinner as fits the wait, no layout jump when content
  lands, no "nothing here" message before the data arrives, buttons show
  they're working.

## 5. Error

- Make the request fail:

  ```js
  await page.route("**/api/items*", (r) => r.fulfill({ status: 500, body: "boom" }));
  // or: (r) => r.abort("failed")
  ```

- Form errors: submit empty, submit the wrong format, paste something too
  long. Intercept the submit so nothing real is sent.
- Check: the message is next to the cause, in plain words, says what to do
  next, keeps what was typed, and stays until fixed. A raw server message
  or "Something went wrong" with no way forward is a finding.

## 6. Long content and partial data

- Edit the text on the page after it loads:

  ```js
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("h1, h2, h3, .title, [class*=name]"))
      el.textContent = el.textContent + " with a much longer name than anyone planned for";
  });
  ```

- Or return a long list, very long strings, huge numbers, missing optional
  fields and broken image URLs from an intercepted request.
- Check: wrapping, truncation with a way to see the rest, numbers that
  still line up, nothing overlapping, no sideways scroll at 390.

## 7. First use and signed out

- Every new Playwright context starts with no cookies and no storage: that
  is a first visit and a signed-out visit.
- For a signed-in view, use the app's own test sign-in or fake backend.
  Never use real credentials in a crit.
- To clear a saved state mid-run:
  `await page.evaluate(() => localStorage.clear());` then reload.
- Check: the screen explains itself with nothing set up, and signed-out
  visitors get a clear way in that brings them back to the same place.

## 8. Offline

```js
await page.goto(url);
await ctx.setOffline(true);
await page.click("text=Save");
await page.screenshot({ path: ".../offline-save.png" });
```

Check: the person finds out the action didn't go through, and what they
did isn't silently lost.

## 9. What to write down

For each state: the screenshot file, how you produced it (one line), and
what the person sees. In the report's "Not reviewed", list every state you
couldn't produce and why ("error state: no way to make the save fail
without the live API").
