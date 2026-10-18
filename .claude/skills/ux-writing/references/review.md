# Reviewing copy in a codebase

A full pass over the words in an app or a change. Copy this checklist into
your working notes and tick it off.

```
Copy review:
- [ ] 1. Voice guide found (or defaults chosen and noted)
- [ ] 2. Strings listed with the script
- [ ] 3. Gaps searched (data files, server errors, emails, titles)
- [ ] 4. Strings read by pattern
- [ ] 5. Term list checked
- [ ] 6. Accessibility text checked
- [ ] 7. Translation risks checked
- [ ] 8. Seen in place at 390 and 1280, including empty, error and loading
- [ ] 9. Report written, worst first
```

## 1. Voice guide

See SKILL.md section 1. Note which guide you used.

## 2. List the strings

From the app's root:

```sh
node <skill>/scripts/strings.mjs . --flags --terms > strings.txt
```

Write the output to a scratch folder outside the repo. Useful variations:

- Folders only: `strings.mjs src app components`.
- A change only: pass the changed files (`git diff --name-only main`).
- Hand-written HTML or JS sites: add `--all`, because copy is often passed
  to helper functions the script doesn't know about.
- `--json` if you want to sort or group with another script.
- `--tests` to include test and story files; `--ignore a,b` to skip more
  folders.

What the script reads: text between tags in HTML and JSX (with
`{expressions}` shown as placeholders), the attributes people see or hear
(alt, title, placeholder, aria-label, aria-description, aria-valuetext,
label, summary), copy-carrying props and object keys (label, title, hint,
message, description, error, placeholder and similar), strings passed to
toast, alert, confirm, setError and similar, `textContent`, `innerHTML`
and `setAttribute` in plain JS, thrown Error messages, page titles and meta
descriptions, and HTML inside JS strings and template literals. It skips
`node_modules`, build output, `ds/`, `scripts/`, `.claude`, and test files.

Its "look at" notes: dash, vague link, generic button, long button,
interjection, blame word, vague error, please or sorry, exclamation,
capitals, title case, device verb, position or colour, middle dot, alt
missing, alt filename, alt says image, role in name, long sentence,
placeholder only?, joined with +. Every note needs a human read; plenty
will be fine in context.

## 3. Search for the gaps

The script can't see these. Search for them:

- Copy in JSON, YAML, Markdown or MDX, a CMS, or i18n files
  (`locales/`, `messages/`, `*.po`, `*.ftl`).
- Messages from the server or database that reach the screen. Look at how
  errors are turned into messages (an error helper, API responses with a
  `message` field) and check raw technical messages never get shown.
- Strings built at run time from data (status names, enums mapped to
  labels).
- Emails, push notifications, SMS, and app store text.
- `<title>` and Open Graph tags if the app sets them in code.
- Images: check every `<img>`, CSS background that carries meaning, and
  inline SVG with text.

## 4. Read by pattern

Group strings by kind (all buttons, all errors, all empty states) and read
each group against `patterns.md`. Reading by group shows inconsistency fast:
3 different ways of saying "couldn't save" will stand out.

For each screen, also ask:

- Does the heading say what the screen is for, and does the main button
  match it?
- Is there 1 primary action, and is its label the most specific verb?
- Does anything repeat what's already on screen?
- Would this make sense to someone arriving from a link, with no context?

## 5. Term list

Use the `--terms` output and `term-list.md`. Decide or confirm each pair.

## 6. Accessibility text

Against `accessibility-text.md`: alt text, icon button names, label in
name, link text, error text that isn't colour only, status messages,
`lang`. Check visible text and accessible names match: for each
`aria-label` on something with visible text, the name contains the visible
words, ideally first.

## 7. Translation risks

Against `localisation.md`: joined strings, hand-written plurals, hand-built
dates, fixed widths on text, text in images.

## 8. See it in place

Open the app with Playwright and the preinstalled Chromium:

```js
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
```

Never run `playwright install`. Use the app's own dev or preview server and
its usual port, or an e2e setup if it has one with fake data. Look at each
screen whose copy you're reporting on at 390 and 1280 wide, and in the
empty, error and loading states where you can reach them. Check for
truncation, wrapping that breaks a button, copy that contradicts something
nearby, and errors that disappear.

If you couldn't reach a state, say so in the report. Don't describe a
screen you didn't see.

## 9. Report

For a designer who doesn't read code: plain words, worst first, no code
unless asked. Group by what happens to the person.

```
Copy review: <app or change>

Voice guide used: <name, or "none, so I used sentence case, 'you', UK spelling">
Checked: <n> strings in <n> files; seen in place: <screens and states>, at 390 and 1280.
Not checked: <anything you couldn't reach or see>

Stops people doing the task
1. <Where>: "<current>" -> "<suggested>". <Why, in 1 line.>

Confusing or inconsistent
2. ...

Accessibility text
3. ...

Polish
4. ...

Term list
<use / don't use / notes, for the pairs found>

Worth testing with people
<strings where a paraphrase test would settle it>
```

Rank by what happens to the person: blocked or misled first (missing labels,
errors with no fix, buttons that say the wrong thing, destructive actions
without warning), then confusion and inconsistency, then accessibility text
that excludes people (this can move to the top when it blocks a screen
reader user), then polish.

Where strings live in code, give the file and line once per finding so it
can be fixed. Keep the suggested copy in the voice guide's style. Audits
report; change the copy only when asked to.
