# Readability

What the research says about how people read interfaces, and what to do
about it. Source tags in brackets point to `sources.md`.

## Contents

- People scan
- Front-load
- Plain language, and who it's for
- Sentence and paragraph length
- Words
- Reading age and readability scores
- Testing copy with people

## People scan

- On an average web page, people have time to read at most about 28% of
  the words, and about 20% is more likely [NNg-read]. In an interface it's
  less: people read until they think they know what to do.
- They often scan in an F shape: across the top, then down the left edge
  [GDS-structure]. Whatever isn't at the start of a line or block is the
  part most likely to be missed.
- So: the useful words go first, the screen holds only what's needed for
  this step, and nothing important lives only in the middle of a paragraph.

## Front-load

- In a study of link text cut to its first 11 characters (about 2 words),
  people could often still predict where a link went when its first words
  were specific, and couldn't when it started with filler: 35% of the
  truncated links gave no idea of their destination [NNg-first2].
- Put the distinguishing word first in buttons, links, list items, headings,
  notifications and accessible names: "Delete photo", "Edit Sam's
  details", "Delivery: Thursday 9 to 11" [NNg-first2] [APG-names].
- Inverted pyramid: the most important point, then smaller details
  [GDS-structure].

## Plain language, and who it's for

- Plain language is for everyone, experts included. In the research GOV.UK
  cites, 80% of people preferred sentences in clear English, and the
  preference grew as the subject got more complex and the reader more
  specialist [GDS-language].
- People with high literacy prefer it because it lets them understand
  quickly. People with low literacy, people reading in a second language,
  people who are stressed, tired or distracted need it [GDS-language].
- Literacy is lower than most writers assume: the National Literacy Trust
  figures GOV.UK quotes put adults with very poor literacy at 1 in 6 in
  England [GDS-language].
- Specialist terms are fine when the audience uses them. Explain each one
  the first time, or link to a definition [GDS-language] [Apple-inclusion].

## Sentence and paragraph length

- Split sentences over about 25 words [GDS-language]. In UI, most strings
  should be well under that.
- No more than 5 sentences to a paragraph [GDS-language]. In UI, 1 or 2.
- One idea per sentence. A sentence with several commas and joining words
  is usually 2 sentences [MS-global].
- Active voice and present tense: "The company polluted the lake", "You
  must do it" [Digital.gov-writing] [GDS-language].
- Turn hidden verbs back into verbs: "We analyse data" over "We conduct an
  analysis of the data". Watch for -tion, -ment, -sion, -ance
  [Digital.gov-writing] [GDS-language].

## Words

- Use the short, common word: buy, help, about, use, start, need
  [GDS-language].
- An older version of GOV.UK's guidance (2022) noted that once people know
  a word they recognise its shape rather than reading every letter, and
  that a long word (8 or 9 letters) makes readers more likely to skip the
  short words after it [GDS-archive].
- "Must" for things required by law or the rules, "need to" for steps, "can"
  for options [GDS-language].
- Avoid idioms and culture-bound references. They confuse second-language
  readers and translate badly [MS-global] [Apple-inclusion].
- Keep "only" and other modifiers next to the word they modify [MS-global].
- Avoid words that make people feel slow if it isn't easy for them:
  "simply", "just", "easy", "obviously". (No source states this as a rule;
  it follows from writing for stressed and less confident readers. Treat it
  as a default.)
- Contractions: GOV.UK allows positive ones ("you'll") but avoids negative
  ones ("can't", "don't") because some readers misread them
  [GDS-language]. Many product voices use "can't" freely. Follow the voice
  guide; in high-stakes instructions, "cannot" is the safer default.

## Reading age and readability scores

- GOV.UK used to say write for a reading age of 9, based on how most adults
  in the UK read; the current guidance states the principle without the
  number [GDS-archive] [GDS-language]. It's a target for the plainness of
  the words and sentences. It doesn't mean writing for children.
- WCAG 2.2 has a reading-level criterion, 3.1.5 Reading Level, at level AAA:
  when text needs more than lower secondary education reading ability
  (around 7 to 9 years of school), provide a simpler version or
  supplement. It's AAA because the working group couldn't find a reliable
  test for clarity [WCAG-3.1.5].
- Readability formulas (Flesch and the like) count syllables and sentence
  lengths. Plain-language specialists warn that lowering a score doesn't
  make text easier to understand, and the experts behind the ISO
  plain-language standard chose not to endorse them [Canada-readability].
  Use a score as a smoke alarm at most. Never rewrite to hit a number, and
  never report a score as proof copy is clear.

## Testing copy with people

The only real test of clarity is people trying to use it [Canada-readability]
[Digital.gov-test]:

- Paraphrase testing: ask someone to read a short screen and say in their
  own words what it means and what they'd do next. Good for errors,
  permissions and confirmation dialogs [Digital.gov-test].
- Usability testing: watch someone do the task. Good for flows and forms.
- Pair writing and crits: write with the person who knows the subject, then
  review together. Content Design London's book has chapters on both
  [CDL-book].

When you can't test, say in your report which strings would most benefit
from it.
