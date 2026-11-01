# AI tells: the full catalogue

Everything SKILL.md ranks, with more examples, where each pattern comes from and what to do about it. Tags in square brackets match `sources.md`. Bad examples are struck through or sit between `copy-check` markers, so `check-copy.mjs` skips them.

Three things to hold onto while using this list:

- **None of these proves anything on its own.** Wikipedia's editors, the researchers and The Economist all say so [WP-AISIGNS] [Kreuz] [Econ-2026]. One ~~crucial~~ is chance. 4 of these in a paragraph is a pattern. Fix the pattern.
- **Fixing the surface isn't fixing the writing.** Wikipedia warns that cleaning off the signs without fixing what's underneath only makes bad text harder to spot [WP-AISIGNS]. If a sentence has a tell, the thought behind it is usually vague too. Rewrite the thought.
- **The tells move.** ~~Delve~~ peaked in 2023 to 2024 and fell away in 2025 [WP-AISIGNS] [Kobak]. Newer models were tuned to drop em dashes, and the result is text with nothing but commas and full stops, which is now a tell of its own [WP-AISIGNS]. Swapping a banned pattern for its nearest cousin ("rather than" for "not X but Y") only makes the next tell.

Experts who use chatbots a lot spot AI text far better than other people (a majority vote of 5 of them got 299 of 300 articles right). The clues they cited most were vocabulary (53% of explanations), sentence structure (36%), grammar and punctuation that was too clean (25%), lack of originality (24%) and clarity, meaning over-explaining (20%) [Russell].

## 1. Sentence shapes

### Negative parallelism (worst)

Framing a point as a correction of something nobody said. Wikipedia lists 3 forms; the reversed "Y rather than X" is the one it calls most common in recent output [WP-AISIGNS]. Sam Kriss's piece on AI style is introduced with the "explosion of em dashes and negation" in LinkedIn posts and college essays [Kriss]. Trev has banned it by name: "Any 'X, not Y' or 'X, never Y' construction. He hates these." (obvious's CLAUDE.md).

<!-- copy-check: off -->
- "It's not a review site. It's a community."
- "Not just a checklist, but a ritual."
- "Roles, not sizes." / "Shared, never themed." / "Live, not screenshots." (Trev's own examples of what he hates)
- "No accounts. No tracking. Just your data."
- "A bridge between your notes and your shop, rather than another list app."
- Mid-2026 corrective framing: "should be treated as a guide rather than a rule", "This doesn't mean that..." [WP-AISIGNS]
<!-- copy-check: on -->

Fix: say the positive thing and stop. "A list app that remembers where you bought things." If the contrast is the real news (a decision between 2 options in a case study), give both options and why one won, in full sentences.

### Fragment stacks

Short sentences or single words standing alone for manufactured emphasis [Tropes].

<!-- copy-check: off -->
- "Fast. Simple. Yours."
- "He published this. Openly. In a book."
<!-- copy-check: on -->

Fix: one sentence that says what makes it fast. Trev's short sentences carry a fact each ("No sign-up."), which is the difference.

### Rule of three

"Adjective, adjective, adjective" and "short phrase, short phrase, and short phrase", used to make a thin point look thorough [WP-AISIGNS]. The experts in [Russell] named "consistent lists of three" as a structural clue.

<!-- copy-check: off -->
- "Clean, fast and intuitive."
- "It brings together planning, tracking, and sharing."
<!-- copy-check: on -->

Fix: keep the 1 or 2 that are true and specific. A real list of 3 things is fine ("Morning and night are 2 cards" is not a triple; "kerning, leading, measure and rag" is a real list of lessons).

### Trailing "-ing" commentary

A present participle tacked on the end to add significance: ~~highlighting~~, ~~underscoring~~, ~~reflecting~~, ~~ensuring~~, ~~fostering~~, ~~contributing to~~ [WP-AISIGNS]. Instruction-tuned models use present participial clauses at 2 to 5 times the human rate [Reinhart].

<!-- copy-check: off -->
- "Load time fell by 40%, highlighting the team's commitment to performance."
<!-- copy-check: on -->

Fix: end at the fact. If the consequence matters, give it its own sentence with its own evidence.

### Copula dodging

Avoiding "is" and "has": ~~serves as~~, ~~stands as~~, ~~functions as~~, ~~represents~~, ~~boasts~~, ~~features~~, ~~offers~~ [WP-AISIGNS]. One study found "is" and "are" fell by over 10% in academic writing in 2023 [WP-AISIGNS]. People write "is", "has", "wrote", "moved", "used"; models write ~~authored~~, ~~relocated~~, ~~utilised~~ [WP-AISIGNS].

Fix: ~~Ritual serves as a daily companion for your skin.~~ "Ritual is a skincare checklist."

### Question then answer

A short question the writer answers straight away [Tropes] [Econ-intro, "Do not be too chatty"].

Fix: ~~The catch? There isn't one.~~ "It's free." ~~The result?~~ Say the result.

### False suspense and reveals

~~Here's the thing.~~ ~~But here's the kicker.~~ ~~The best part?~~ ~~Plot twist:~~ Say the thing.

### Aphorisms

Lines built to be quoted. Trev's examples: ~~Shared, never themed.~~ ~~Roles, not sizes.~~ (obvious's CLAUDE.md). Orwell's first rule is about the same habit: figures of speech you're used to seeing in print [Orwell].

Fix: give the specific fact, or cut the line. If it would fit on a mug, it goes.

### Didactic openers

The Economist warns that too many sentences beginning ~~Compare~~, ~~Consider~~, ~~Imagine~~, ~~Note~~ or ~~Remember~~ make the reader feel they're in a textbook [Econ-intro]. Also ~~Let's~~ and ~~Think of it as~~.

## 2. Words

### The vocabulary

Words that LLMs overuse, measured against what came before [Kobak] [WP-AISIGNS]. In 15 million biomedical abstracts, ~~delves~~ was 28 times its expected rate in 2024, ~~underscores~~ 13.8 times and ~~showcasing~~ 10.7 times; at least 13.5% of 2024 abstracts were processed with an LLM [Kobak]. The excess words were style words (mostly verbs and adjectives), unrelated to content.

<!-- copy-check: off -->
By era, from Wikipedia's list [WP-AISIGNS]:

- 2023 to mid-2024: additionally, boasts, bolstered, crucial, delve, emphasizing, enduring, garner, intricate, interplay, key, landscape, meticulously, pivotal, underscore, tapestry, testament, valuable, vibrant.
- Mid-2024 to mid-2025: align with, bolstered, crucial, emphasizing, enhance, enduring, fostering, highlighting, pivotal, showcasing, underscore, vibrant.
- Mid-2025 to mid-2026: emphasizing, enhance, highlighting, showcasing.
- Mid-2026 on: challenge, clearer, dependable, echoed, foster, leverage, matters, multifaceted, practical, prioritize, quietly, steady, universally, with "much more period and comma usage and shorter sentences around a strict 8 to 20 word limit".

Also flagged by the experts in [Russell]: vibrant, crucial, significantly, testament, delve, showcase, demonstrating, and "notes" or "explains" where a person writes "says".

GOV.UK's own banned list, which overlaps a lot [GOVUK-AZ]: agenda, advance, collaborate, combat, commit, deliver (for abstract things), deploy, dialogue, empower, facilitate, focus, foster, impact, initiate, key, land, leverage, overarching, progress, promote, robust, streamline, strengthening, tackle, transform, utilise, drive, going forward, in order to, hub, portal, one-stop shop.
<!-- copy-check: on -->

Wikipedia's rule for using this list applies here too: take it literally. A word being overused doesn't make its synonyms suspect, and literal uses are fine (a real landscape, a real journey) [WP-AISIGNS].

Fix: the plain word (use, show, help, has, important) or nothing. Monzo's test is to read it out loud and ask if you'd say it face to face [Monzo].

### Puffery

Advert and travel-guide language: ~~boasts~~, ~~nestled~~, ~~in the heart of~~, ~~groundbreaking~~, ~~renowned~~, ~~diverse array~~, ~~rich~~, ~~profound~~ [WP-AISIGNS]. Monzo calls these "empty adjectives and marketing cliches" that make copy sound copywritten [Monzo].

Fix: ~~a powerful, beautiful, intuitive app~~ Say what it does and let the reader judge it. The Economist: "Do not be too pleased with yourself" [Econ-intro].

### Inflated significance

~~A pivotal moment~~, ~~marks a shift~~, ~~reflects broader trends~~, ~~setting the stage for~~, ~~indelible mark~~, ~~evolving landscape~~ [WP-AISIGNS]. Tropes calls it grandiose stakes inflation [Tropes].

Fix: the change at its actual size. ~~transforms how you cook~~ "Plans the week's dinners from what's in the fridge."

### Magic adverbs and intensifiers

~~Quietly~~, ~~deeply~~, ~~fundamentally~~, ~~remarkably~~ [Tropes]; ~~quietly~~ is on Wikipedia's mid-2026 list [WP-AISIGNS]. Kriss found "quiet" 10 times in a 759-word machine essay about pebbles [Kriss]. Gowers: "do not use superfluous adjectives and adverbs" [Gowers]. Leonard's whole list is about this habit in dialogue [Leonard].

Fix: cut, or say how. ~~It quietly fixes the problem.~~ "It fixes the problem the next time you open it."

### Vague attribution

"Experts argue", "industry reports", "observers have cited", "users love it" [WP-AISIGNS].

Fix: name who and how many, or cut it. In the portfolio this is a truth rule as well as a style one (`write-portfolio`).

### Invented concept labels

Coined terms that sound analytical: "workload creep", "the acceleration trap" [Tropes]. Fix: say the problem in plain words.

### Elegant variation

Rotating synonyms for one thing so no word repeats, from repetition penalties in older models [WP-AISIGNS]. ~~the app... the tool... the platform... the solution~~ Pick one name and keep it. GOV.UK and WCAG's consistent identification point the same way for UI terms (see `ux-writing`).

### Nominalisations

Verbs turned into nouns ("completion", "implementation", "utilisation"). Instruction-tuned models use them at 1.5 to 2 times the human rate [Reinhart]. Pinker: nominalisation "takes a perfectly spry verb and embalms it into a lifeless noun" [Pinker]. The Plain English Campaign says they "sound as if nothing is actually happening in the sentence" [PEC] <!-- copy-ok -->. Zinsser called -ion and -ent nouns "the enemy" [Zinsser-ESL].

Fix: ~~Completion of the setup is required.~~ "Finish setting up."

## 3. Structure

### Summary closers and tidy endings

~~In summary~~, ~~In conclusion~~, ~~Overall~~, ~~In short~~, and the optimistic vague ending [WP-AISIGNS] [Russell]. Fix: end on the last useful fact.

### Preamble and signposting

~~Let's take a look~~, ~~Here's how it works:~~, ~~In this post I'll cover~~, ~~This chapter discusses~~. Pinker calls it metadiscourse, "verbiage about verbiage", there to help the writer and not the reader [Pinker]. The Economist: don't spend sentences "clearing your throat, setting the scene or sketching in the background" [Econ-intro]. Fix: start with the content.

### Despite-its-challenges endings

The outline-style ending: ~~Despite these challenges...~~, ~~Challenges and legacy~~, ~~Future outlook~~ [WP-AISIGNS] [Tropes]. Fix: say what went wrong and what changed.

### Bold-label bullets and lists for everything

"Inline-header vertical lists" (a bold label, a colon, a sentence) are one of Wikipedia's style tells [WP-AISIGNS]. Overused boldface too. Fix: prose, a plain list, or a table if every row has a label.

### Explaining before saying

Leading with the reasoning when the reader wants the change. Monzo: "We can explain our reasoning, but need to explain the impact first" [Monzo]. Fix: what changed, then why.

### Over-explaining

The experts in [Russell] flagged AI text that "tells" instead of shows and includes irrelevant detail. Vonnegut: "Do not ramble, though" [Vonnegut]. Leonard: "Try to leave out the part that readers tend to skip" [Leonard]. Fix: cut the sentence that restates the one before it, and the caption that describes what the screen already shows.

### Formulaic quotes and names

In AI-written articles, quotes all sound like the article and sit at the end of paragraphs; made-up people are called Emily or Sarah [Russell]. Fix: never invent a quote or a person. Trev's rules forbid it anyway.

### Uniform paragraphs and one-line paragraphs

The Economist allows one-sentence paragraphs "only occasionally" [Econ-intro]. A page of 2-sentence paragraphs, each a claim plus a gloss, is a machine rhythm. Fix: let paragraphs follow the thought.

## 4. Punctuation and formatting

### Em dashes

Wikipedia: LLMs use them far more than non-professional writers of the same genre, "in a formulaic, pat way", often spaced, often where a person would use a comma, brackets or a colon [WP-AISIGNS]. It reports a July 2026 study finding Claude the one current model still using them more than professional writers (Wikipedia's summary; the study itself wasn't checked here). Kreuz notes people name em dashes as a tell but detect AI with them barely better than chance [Kreuz]. Trev bans them anyway, so they go. The Guardian allows "a touch of drama" with an en dash, sparingly [Guardian]; Trev doesn't, and he wins.

Fix: full stop, comma, colon or brackets. ~~It works — mostly.~~ "It mostly works." For ranges, "to" [GOVUK-AZ].

### Punctuation that's too even

Models told to drop dashes now overuse commas and full stops, and "the overall variety has dropped significantly" [WP-AISIGNS]. The experts in [Russell] read too-clean grammar and unvaried punctuation as AI. Fix: use brackets for asides the way Trev does, a colon before an example, the odd semicolon where it's the right join, a real question.

### Uniform sentence length

The mid-2026 tell is short sentences held between 8 and 20 words [WP-AISIGNS]. The Plain English Campaign's average of 15 to 20 words comes with a warning: "This does not mean making every sentence the same length" [PEC]. Human sentences vary more [Russell]. Fix: mix them.

### Title case headings, all-caps labels, emoji, curly quotes

All on Wikipedia's style list: title case in section headings, emoji at the start of headings and list items, curly quotes and apostrophes [WP-AISIGNS]. Trev's design rules ban eyebrows and tracked capitals (obvious's CLAUDE.md). Fix: sentence case, no emoji, straight quotes.

### Exclamation marks

Leonard allows "no more than two or three per 100,000 words of prose" [Leonard]. The Guardian quotes Fitzgerald: "like laughing at your own jokes" [Guardian]. Mailchimp never uses them in failure messages or alerts [Mailchimp-GM]. Fix: drop it.

### Markdown leftovers

Asterisks for bold in places that don't render Markdown, stray `---` dividers, headings that start with the page's own title at level 1 [WP-AISIGNS]. Fix: format for where the words will be read (a commit message isn't Markdown).

## 5. Tone

### Chat leftovers and sycophancy

~~I hope this helps~~, ~~Of course!~~, ~~Certainly!~~, ~~You're absolutely right!~~, ~~Would you like...~~, ~~let me know~~, ~~Here is a...~~ [WP-AISIGNS]. Fix: cut. In a PR description, stop after the last thing a reviewer needs.

### Hedging

~~It's important to note~~, ~~based on available information~~, ~~while specific details are limited~~ [WP-AISIGNS]; ~~it's worth noting~~, ~~importantly~~, ~~notably~~ [Tropes]. Pinker: hedging should be "a choice, not a tic" [Pinker]. Fix: say it plainly, or say what you don't know in one clause and move on. <!-- copy-ok: quoting Pinker -->

### Purple and spectral writing

Ghosts, shadows, quietness, "the soft hum of distant conversation", Thursday as a "liminal day that tastes of almost-Friday", sorrow that "tastes of metal" [Kriss]. Trev's own limit: "A Baskerville italic says that in a way a grotesk cannot" is on the edge, "something found in a drawer" is over it (obvious's CLAUDE.md). Fix: the plain physical fact.

### Forced metaphors

Orwell's rule 1 [Orwell]; GOV.UK: metaphors "do not say what you actually mean and lead to slower comprehension" [GOVUK-AZ] <!-- copy-ok -->. Monzo allows one only if it's "easy to understand at first glance" [Monzo]. Fix: ~~Think of it as a Swiss army knife for sauce.~~ Say how it works.

### Too pleased, too chatty, too didactic

The Economist's introduction: don't boast, don't write "Surprise, surprise", don't lecture with "Consider" and "Imagine", and "Go easy on the oughts and shoulds" [Econ-intro]. NHS: avoid "should", which "can sound patronising" [NHS-tone].

### Safe and bland

The experts in [Russell] found AI writing "safe", lacking surprise or humour. Monzo: "we avoid the obvious to keep things fresh", and "Even if the chance to make five excellent jokes is there, hold off and just pick the best one" [Monzo] <!-- copy-ok -->. Fix: the reason Trev made it, the detail only he'd notice, one dry aside.

### Ghost lecturing

Explaining the principle when the decision is the point. Trev: "Nobody needs to be told what 'the most common way a page stops matching its siblings' is" (obvious's CLAUDE.md). Fix: state the decision.

## Signs of human writing

What Wikipedia's editors found more often in human text than AI text [WP-AISIGNS]: plain "there is" and "it has"; plain verbs (wrote, moved, used, tried, died); superlatives and definite claims ("the first", "the only"); some qualifiers ("perhaps", "tends to"); and the occasional wordy phrase. A mix of casual and technical registers is common in people who work in tech, and isn't a tell [WP-AISIGNS]. Contractions and slang read as human, though the experts in [Russell] were sometimes fooled by them.

So Trev's habits are the cure as well as the voice: first person, his real reason, brackets, a definite claim, a dry word at the end.

## What the checker can't see

`check-copy.mjs` finds strings. It can't tell whether a fact is true, whether a joke lands, whether the sentence rhythm is a person's, or whether the first line says what the reader came for. Those need a read aloud and the self-check in SKILL.md.
