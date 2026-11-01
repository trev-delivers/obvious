---
name: write-like-trev
description: Write and edit copy in Trev Morris's voice, the way a good human content designer would. Use whenever you write or change user-facing words for Trev's projects, including UI strings, buttons, errors, empty states, page and marketing copy, blog posts, READMEs, docs, PR descriptions, commit messages and portfolio case studies. Also use when asked to tidy, tighten or de-AI any of that copy, or to check whether it sounds like AI.
---

# Write like Trev

Trev is a product designer in Surrey. He reads every word that goes into his projects, and he can tell when a machine wrote it. This is how to write so it reads like him.

His voice and his stated rules come first. Where an outside guide says something different, he wins. Where a rule here gets in the way of saying something true and plain, say the true and plain thing.

Truth comes before style. Don't invent facts, numbers, quotes, dates or reasons, and don't fill a gap with something that sounds right. Take facts from the repo, the live site or Trev, and ask him when they aren't there. For the portfolio, `write-portfolio` has the full truth rules: load it as well.

## How Trev sounds

Lines of his:

- "The unofficial archive of everything we've squeezed, drizzled, or regretted."
- "Built for sensitive skin. Product names link out to where to buy."
- "Nobody's written a word on this one yet."
- "No sign-up. Finds save to this phone as you go."

Explaining why he made something, as he typed it:

> "ive never had a skincare regime, but decided now was a good time. i wanted an easy way I could add to the routine (my wife has really got me into it haha..) but also make something that people can use themselves."

> "the aim of this is to use it every morning and every evening, so for that, i made sure the design followed the light in the room, switches over to dark mode when the glare is all too much!" <!-- copy-ok -->

From his notes on the Smuggle Brawlers write-up, which replaced a draft full of build dates and counts:

> "Back in 2021, just after COVID, NFTs were taking off and Jesse put out Jesus 2 collections of his own. What I liked was that it was him drawing."

> "It's been a pleasure to work with Jesse. The world and the characters are his, and he's held the creative licence for all of it."

What these do: name the actual thing, give the one fact the reader needs, and let a single wry word carry any joke ("regretted"). The reason is personal and first person ("my wife has really got me into it"). Asides go in brackets. Nothing is set up, nothing is summed up, and there's no moral.

His Condimental README opens: "My friends and I have opinions about sauce, so I made somewhere to keep them." Strings he's kept in Morris OS show the same thing at UI size: "Nothing needs buying. Nice." / "It goes for good." / "Couldn't copy it. Press and hold the link instead." / "Everything's already here."

What his own edits show: he cut build dates, commit counts and test numbers that would go stale; changed ~~2009 – 13~~ to "2009 to 2013"; changed "practice" (verb) to "practise"; said "about 200" for a rough count; and swapped an agent's suggested wording about who wrote the code for the plain truth ("Claude wrote the code and I reviewed it"). Keep copy evergreen unless the date is the point, and credit honestly.

Tidy his spelling and capitals, check his facts (Ritual follows the clock; it has no light sensor), and drop "haha" and the exclamation mark from published copy. Keep the "I", the reason and the aside. If a draft reads like the system describing itself, it's wrong even when every rule below is met.

## How to write it

**Before.** Work out who reads it and the one thing they came for. Collect the facts from the repo (README, CLAUDE.md, the code, the commit log) and note what's missing instead of guessing. Find something Trev has already written about the same thing and match it. Then say it out loud the way you'd tell a friend, and write that down. For anything longer than a screen, list what the reader needs to know before you write a sentence (Monzo's tip, and usually half the draft).

**During.** Put the point first. One idea per sentence. Concrete nouns and plain verbs ("is", "has", "wrote", "moved"). Call each thing by one name all the way through. Give the reason after the fact, and only if the reader needs it. Write the whole draft before polishing any of it.

**After.** Cut. Aim to lose a tenth: openers, recaps, adjectives, the sentence that only restates the one before. Read it aloud in Trev's voice and rewrite anything you wouldn't say. Run the checker (below) and fix what it finds by rewriting the thought, since swapping one tell for its cousin doesn't help. Check every fact against its source. Then run the self-check at the end of this file.

The checker: `node .claude/skills/write-like-trev/scripts/check-copy.mjs <files or folders>` (or `-` to read stdin, such as a commit message). It flags dashes, banned words, ~~X, not Y~~, stock phrases, openers, title case, US spellings and more, with file and line. `--soft` shows only the strong tells. It can't hear rhythm or tell a fact from a guess: that's still your job.

## Rules

### Words

<!-- copy-check: off -->
- Use the everyday word: use, help, need, give, start, about, enough, show, buy, get.
- Never use: delve, leverage, utilise, seamless, robust, elevate, empower, unlock (unless it's an achievement or a door), streamline, journey (unless it's a trip), tapestry, landscape (unless it's land), testament, pivotal, vibrant, crucial, foster, navigate (unless it's a map or a menu), showcase, underscore, bolster, garner, intricate, meticulous, multifaceted, interplay, enduring, game-changer, cutting-edge, effortless, delightful, transformative, straightforward, certainly.
- Words that rose with 2026 models: matters ("why it matters"), quietly, steady, dependable, practical, clearer, universally, echoed, prioritise, challenge (as a soft noun). Use them only when they're literally the right word.
- Cut intensifiers and magic adverbs: really, truly, deeply, quietly, fundamentally, incredibly, simply, just, actually, very.
<!-- copy-check: on -->
- Say "is" and "has". Don't swap them for ~~serves as~~, ~~stands as~~, ~~boasts~~, ~~features~~ or ~~offers~~.
- Name the thing and keep its name. If it's the dashboard, it's the dashboard every time.
- Prefer the specific version. "Saves to this phone" beats "stored locally". "12 recipes" beats "a growing collection".
- Define jargon the first time, or swap it for plain words. Internal names stay internal.

### Sentences

- One idea per sentence. Most under 20 words, but vary them: a 4-word sentence next to a 25-word one reads like a person. Every sentence at 12 to 18 words is its own tell.
- Active voice when the doer matters: "We couldn't save your note." Passive is fine when the doer doesn't ("The bill was paid").
- "You" for the reader. "I" for Trev on his own projects (theme notes, READMEs, docs pages, case studies, blog posts). "We" only for a real team. In his small apps, often no subject at all: "Couldn't load your finds."
- Contractions: it's, you'll, can't, nobody's.
- Put the word you want to land at the end of the sentence (Strunk's rule 18).
- Humour: one light touch per piece at most, the best one, and never in errors, warnings, money or anything sensitive.

### Structure

- Lead with what the reader came for. Context comes after, if at all.
- Say what it does, why it's there, then stop. No recap, no sign-off, no tie-back to the opening.
- Prose over bullets. A list is for parallel things someone will scan or count. Steps in order are a numbered list.
- Headings in sentence case that say what's in the section: "How saving works". No eyebrow labels above them.
- Don't announce what's coming ("Here's how it works:") or count before listing ("3 reasons why") unless the number is the point.
- Paragraphs of 1 to 4 sentences. A run of one-sentence paragraphs reads as a LinkedIn post.
- Bold once or twice a page at most, for something the reader mustn't miss.
- Link text says where it goes: "Read the setup guide". Never "click here" or "learn more".

### Punctuation

- No em dashes or en dashes, and no spaced hyphen standing in for one. Use a full stop, a comma, brackets or a colon.
- Ranges take "to": 2009 to 2013, 9am to 5pm, pages 4 to 7 (GOV.UK).
- Vary the punctuation you do use. Removing dashes and leaving only commas and full stops is a newer tell. Brackets for asides (Trev uses them), a colon before an example, the odd question if it's a real one.
- Straight quotes and apostrophes. No arrows or decorative Unicode in prose. No emoji.
- No exclamation marks in UI, errors or alerts. One on a whole marketing page at most.

## AI tells, ranked

Fix these on sight. Worst first in each group, and if you only fix 5 things, fix the first item in each group. Before is struck through. The full catalogue, with sources, is in `references/ai-tells.md`.

### Sentence shapes

1. **Negative parallelism.** Framing a point as a correction nobody asked for: ~~X, not Y~~, ~~not just X but Y~~, ~~It's not X. It's Y.~~, ~~no X, no Y, just Z~~, and the 2026 cousin ~~Y rather than X~~. ~~It's not a list app. It's a memory.~~ "A list app that remembers where you bought things."
2. **Fragment stacks.** ~~Fast. Simple. Yours.~~ "It opens straight to today's list."
3. **Rule of three by reflex.** ~~Clean, fast and intuitive.~~ Keep the one that's true, or 2. Trev's "squeezed, drizzled, or regretted" works because each word is concrete and the last is the joke.
4. **Trailing "-ing" commentary.** ~~...cutting load time by 40%, highlighting the team's focus on speed.~~ End at "40%".
5. **Question then answer.** ~~The catch? There isn't one.~~ "It's free."
6. **False suspense.** ~~Here's the thing:~~ ~~But here's the kicker~~ Say the thing.
7. **Copula dodging.** ~~Ritual serves as a daily companion~~ "Ritual is a checklist."
8. **Aphorisms.** Anything that would fit on a mug. ~~Good design is invisible.~~ Give the fact or cut the line.

### Words

1. **The vocabulary list above.** One may be chance; 3 in a paragraph is a machine. ~~A robust, seamless way to showcase your finds~~ "Your finds, on one page."
2. **Puffery.** ~~a powerful, beautiful, intuitive app~~ Show what it does and let the reader decide.
3. **Inflated stakes.** ~~transforms how you cook~~ "Plans the week's dinners from what's in the fridge."
4. **Magic adverbs.** ~~It quietly fixes the problem.~~ "It fixes the problem when you open it."
5. **Vague attribution.** ~~Users loved it.~~ Name who and how many, or cut it.
6. **Invented concept labels.** ~~the curation gap~~ Describe the problem in ordinary words.
7. **Elegant variation.** ~~the tool... the platform... the solution~~ Pick one name.

### Structure

1. **Summary closers.** ~~In short, it saves you time.~~ End on the last useful fact.
2. **Preamble and signposting.** ~~Let's take a look at how it works.~~ ~~In this post I'll cover~~ Start with the content.
3. **Lecturing.** Opening with what design "should" be. Say what you did on this project.
4. **Bold-label bullets.** ~~**Speed**: it's quick~~ Make it a sentence or a table.
5. **"Despite challenges" optimism.** ~~Despite these challenges, the project thrived.~~ Say what went wrong and what changed.
6. **Explaining before saying.** Leading with the reasoning when the reader wants the change. Change first, reason second (Monzo).
7. **Narrating the UI.** ~~Tap a bottle and you get its page.~~ If the screen shows it, cut the caption.

### Punctuation and formatting

1. **Em dashes**, en dashes and spaced hyphens. ~~It works — mostly.~~ "It mostly works."
2. **Title Case Headings** and ALL-CAPS eyebrows. "How saving works."
3. **Emoji as bullets or headings.** None.
4. **Exclamation marks.** ~~Saved!~~ "Recipe saved."
5. **Curly quotes** in Markdown, code comments and commit messages. Straight ones.
6. **Uniform rhythm.** Every sentence the same length and every paragraph 2 sentences. Vary them.

### Tone

1. **Sycophancy and chat leftovers.** ~~Great question!~~ ~~I hope this helps.~~ ~~Let me know if you have any questions!~~ Cut.
2. **Hedging.** ~~It's worth noting that~~ ~~arguably~~ ~~may potentially~~ Say it or don't.
3. **Purple writing.** Whispers, echoes, hums, feelings with tastes. ~~a quiet hum of possibility~~ The plain physical fact.
4. **Forced metaphors.** ~~Think of it as a Swiss army knife for sauce.~~ Say how it works.
5. **Opinion about your own work.** ~~a clean, elegant solution~~ Say what it does.
6. **Too pleased with itself, too chatty, too didactic** (all 3 from The Economist's introduction). No "Surprise, surprise", no sentences starting "Imagine", "Consider" or "Remember".
7. **Safe and flat.** Nothing surprising and nothing only Trev would know. Add the real reason he made it, and the detail only he'd notice.

## Before you hand it over

Run this on every draft:

1. Read it aloud in Trev's voice. Would he say this to a mate over a cup of tea? Rewrite any line he wouldn't.
2. Does the first sentence say what the thing is or does?
3. Is every fact traceable to the repo, the live site or Trev? Is anything a guess dressed up?
4. Run `check-copy.mjs`. Fix each tell by rewriting the sentence, then look at each "check".
5. Any sentence that would work on a poster or a mug? Replace it with a fact.
6. Any ~~X, not Y~~, triple, fragment stack or "rather than" the checker missed?
7. Does it end on a useful fact, with no summary or sign-off?
8. Are the bullets a real list? Are headings sentence case? Are buttons a verb and a noun?
9. Sentence lengths varied? Punctuation varied? No run of one-line paragraphs?
10. UK spelling, numerals, "to" for ranges?
11. Could you cut a third and lose nothing? Then cut it.
12. If it's going public, does anything leak a child's name, a private repo, a password or a surprise? (See the repo's CLAUDE.md.)

## By format

**UI strings.** Buttons are a verb and a noun, sentence case, 1 to 3 words ("Save note", "Add recipe"), repeating the verb from the question above them. Destructive actions name the thing and the result: "Delete 'Weekend bakes'?" then "It goes for good, with its 14 recipes." then "Delete list" and "Cancel" (an example). Errors say what happened and what to do, with no blame, "Oops" or bare codes: "Couldn't load your finds. Check your signal and try again." Empty states say why it's empty and what to do next, and are the one place a joke often fits: "Nothing needs buying. Nice." Labels are short nouns; hints go under the label, never only in the placeholder. Toasts are past tense and name the thing: "Link copied." Toggles describe the on state: "Show prices". Don't describe position or colour. Use the stock phrase for stock situations ("Sign in to see this"). Pick one term per thing across the app. `ux-writing` has the rest.

**Page copy.** The first line says what it is, for whom, in words a stranger would use. One idea per section. Evidence over adjectives. Skip the slogan and say the job: "Staff Product Designer at Cleo. 13 years across fintech, broadcast and consumer apps."

**Blog posts about his side projects and things he enjoys.** First person, his reason up front, the way he'd tell a friend: where it started, what he made, what went wrong, what he liked. Specific details only he'd know are the point (the emoji reactions in Discord that grew into a cast). Let the reader see the thing (a screenshot, a link to play). No "In this post", no lessons-learned list, no closing moral. For anything outside work (rating sauce with friends, the village Christmas trail), don't add feelings or scenes he hasn't described: ask him. Never name his daughter or give her age.

**Case studies.** `write-portfolio` decides what goes in and what's true. In voice terms: open on the situation and what he did, give 2 or 3 real decisions with the trade-off, say what happened with its basis, and say "I" for his work and "we" for the team's. Real numbers only.

**READMEs and docs.** First line says what it is, and in Trev's projects often why he made it, in the first person. Then how to run it. Then anything odd or dangerous. Say what a thing does and why it's there, then stop. No badges wall, no "Features" section of bold-label bullets. In the games, describe nothing that's meant to be a surprise.

**Commits and PRs.** Follow the repo's CLAUDE.md first: in holy-pixels and 4hm-the-game titles stay generic ("Menu tweaks") and branch names neutral, because some of what goes in is a surprise. Elsewhere, a subject line under 60 characters with no full stop that says what the change does ("Clear ticks at 4am, when the night card goes"). The body can be as long as the reasoning earns, in the same plain voice. PR descriptions: what changed, why, and what a reviewer should check. No "This PR aims to", no closing pleasantries. holy-pixels bans model names and IDs in code, commits and PRs; elsewhere use the attribution lines the session gives you, unless the repo says otherwise.

## UK spelling and style decisions

Where guides disagree, this is the call, and why.

- **-ise** (organise, recognise, prioritise, summarise): Guardian and BBC both. Except capsize.
- **Spellings:** colour, centre, behaviour, favourite, grey, catalogue, travelled, cancelled, towards, judgement (BBC's preference), defence. Programme, but computer program (Guardian). Licence and practice are nouns, license and practise are verbs (BBC).
- **Numbers:** numerals for everything, including 2 to 9 (GOV.UK, and Trev's rule, against the Guardian and BBC who spell out one to nine). Write out a number that starts a sentence, or rewrite the sentence. "One" is a judgement call: "1 tap" in UI, "one of the best" in prose (GOV.UK). Commas in thousands: 2,000.
- **Ranges:** always "to": 2009 to 2013, 10am to 11am (GOV.UK).
- **Dates:** 21 July 2026. No ordinals, no comma (GOV.UK, BBC and Guardian agree). In anything read later, name the day ("on Monday") in place of "yesterday" or "tomorrow" (BBC).
- **Times:** 9am, 5:30pm, midday, midnight (GOV.UK). The BBC's 24-hour clock is for news; Trev's apps and READMEs mostly use the 9am style.
- **Contractions:** yes, including can't and don't (Trev, Monzo, Mailchimp). GOV.UK and BBC News avoid negative ones; Trev doesn't.
- **Lists in a sentence:** no Oxford comma unless it stops a misreading (Guardian). Mailchimp always uses one; Trev's projects don't, apart from his own "squeezed, drizzled, or regretted", which is his line and stays as he wrote it.
- **Quotes:** double quotes in prose, single for a quote inside a quote (Guardian and BBC body text). Straight ones in every file.
- **"For example"** in place of eg, ie and etc in UI (GOV.UK: screen readers can read "eg" as "egg").
- **"And"** in place of "&", unless it's a company's own name (GOV.UK, Guardian).
- **Percentages:** 45%, and "percentage points" for a change between percentages (Guardian).
- **Words:** sign in, with no stray "log in" (GOV.UK); email, website, online; OK (Guardian).
- **Americanisms:** meet someone, talk to someone, a power cut (BBC). ~~meet with~~, ~~talk with~~ and ~~outage~~ are the US forms.
- **Hyphens:** none after an -ly adverb ("newly built app"); hyphenate a compound before a noun ("first-class ticket") (BBC).
- **Capitals:** as few as possible. Job titles lower case in running text (BBC, Guardian), apart from Trev's own "Staff Product Designer at Cleo", which keeps his capitals.

Sources are in `references/sources.md`, the AI-tell catalogue in `references/ai-tells.md`, and worked rewrites in `references/before-after.md`.
