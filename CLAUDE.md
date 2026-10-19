# Writing for this repo

Trev's voice, not a design system's. The docs page, the README and the theme
descriptions all get read by him, so they should sound like him.

Plain and concrete. Contractions are fine. Say what a thing does and why it
is there, then stop.

Things to avoid, because he has said so:

- **Aphorisms.** "Shared, never themed." "Roles, not sizes." "Live, not
  screenshots." Any "X, not Y" or "X, never Y" construction. He hates these.
- **Lecturing.** Explaining the general principle behind a decision when the
  decision itself is the point. Nobody needs to be told what "the most common
  way a page stops matching its siblings" is.
- **Purple.** "A Baskerville italic says that in a way a grotesk cannot" is
  on the edge. "Something found in a drawer" is over it.
- **Guff.** If a sentence is opinionated for its own sake, or serving no
  purpose, cut it rather than soften it.

For reference, this is him: "The unofficial archive of everything we've
squeezed, drizzled, or regretted." / "Built for sensitive skin. Product names
link out to where to buy." / "Nobody's written a word on this one yet." /
"No sign-up. Finds save to this phone as you go."

When he explains why he made something, it's first person and personal:
"I've never had a skincare regime, but decided now was a good time. I wanted
an easy way to add to the routine (my wife has really got me into it) but
also make something other people can use." Write theme notes, the README and
docs pages like that, as him telling you what it's for. If it reads like the
system describing itself, rewrite it. The skill at
`.claude/skills/write-like-trev` has more.

Dry, specific, unfussy. Commit messages can still be long where the reasoning
earns it — that part he has not objected to — but the same rules apply to how
they are written.

# Design rules for every app that uses this

These come from Trev. They apply to the docs page and to every app that
takes a theme.

- No monospace. Not for labels, numbers, dates or captions. Figures use the
  text face with `font-variant-numeric: tabular-nums`. The `mono` font slot
  points at each theme's text face so old code still renders in it.
- No eyebrows. No small label sitting above a heading, and nothing in
  capitals with letter-spacing. Labels are sentence case, in the text face,
  using the `label` type role, with no tracking.
- Use the theme's pair: `--ds-font-display` for headings, `--ds-font-sans`
  for everything else. Don't load other faces.
- Take colours, radius, timing and easing from the tokens. If the audit
  flags a literal, swap it or explain it in `.ds-audit.json`.
- Leave out the usual generated-site furniture: gradient text and washes,
  pill badges above headings, glows and blobs, a coloured stripe down the
  side of a card, 01/02/03 on things that aren't steps, a hover lift on
  every card, fade-up on every section, emoji or icons in coloured squares,
  arrows tacked onto links, middle-dot strings of metadata.
- Copy follows the voice notes above. Also no "not X, it's Y", no lists of
  three by habit, no summary closer, no em dashes, UK spelling, numerals
  rather than words.

# Working on it

`npm run check` runs everything: it builds `dist/` (which fails if a theme
is missing a key or a contrast pair has got worse), the registry and the docs
site, runs the tests in `test/`, audits obvious itself with `--max 44`, and
fails if `dist/` or `docs/` isn't committed. CI runs the same, plus the
registry smoke test with the shadcn and Next versions pinned in
`scripts/registry-smoke/package.json`.

It ships by merging to `main`. Vercel deploys the docs site, and apps pick up
the change when they next sync or bump their pin.

Careful with:

- Theme keys. Every theme must have the same keys as `core`, and apps break
  if one disappears.
- `src/primitives.json`. A change there changes every app at once.
- The registry components. Apps copy them in and overwrite their copy on
  the next `add`.
- Theme colours. Don't change them to make the contrast check pass. The
  failing pairs are in `docs/contrast.md` for me to decide.
- `scripts/audit-ds.mjs`, `sync-ds.mjs` and `sync-skills.mjs` are copied
  into apps, so they stay single files with no imports beyond Node's own.
