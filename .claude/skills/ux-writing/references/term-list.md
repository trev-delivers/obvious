# Term list

A term list (or word list, or glossary) records the one word the product
uses for each thing and each action, and the words it doesn't use. Apple's
writing guide recommends one for consistent language; Microsoft's global
writing tips say to use one word per concept and not to use one word for 2
concepts [Apple-writing] [MS-global]. WCAG 3.2.4 Consistent Identification
asks that things with the same function are identified the same way across
pages [WCAG-3.2.4]. Source tags in brackets point to `sources.md`.

## Where it lives

- Look for an existing one first: `TERMS.md`, `docs/terms*`, a glossary in
  the voice guide, or the i18n source file.
- If there isn't one, don't create a file unasked. Put the list in your
  report and offer to add it.

## How to build one from a codebase

1. Run `scripts/strings.mjs <src> --terms`. It counts common competing
   terms, with an example location for each.
2. List the nouns the product shows: the objects people make and manage
   (list, recipe, order, project). Check each is always called the same.
3. List the verbs on buttons and menus. Check the same action always uses
   the same verb, and different actions use different verbs. "Remove from
   list" and "Delete for good" can both be right if they mean different
   things; say so in the list.
4. Check the names match outside the UI: page titles, emails,
   notifications, the README, the app store listing.
5. Decide, record, then fix the strings.

## Format

| Use | Don't use | Notes |
|---|---|---|
| sign in | log in, login (as a verb) | "Sign-in" as a noun or adjective. |
| delete | remove | Delete = gone for good. Remove = taken off this list, still exists. |
| email | e-mail | |

Keep it short. A term earns a row when people have used 2 words for it, or
when it's easy to get wrong.

## Common pairs to decide

- sign in / log in; sign out / log out; sign up / register / create account
- delete / remove / trash; archive / hide
- settings / preferences / options
- cancel / discard / dismiss / close
- edit / change / modify; save / keep / apply / done
- email / e-mail; username / user name; online / on-line
- account / profile; home / dashboard / overview
- search / find; filter / sort (these mean different things)
- the product's own nouns: whatever people make, keep and share

## Capitalisation and product names

- Write feature names in sentence case unless they're registered product
  names. Capitalised feature names make text harder to scan and translate.
- Record any product or feature names that keep their capitals, and the
  exact spelling (one word or 2, internal capitals).
