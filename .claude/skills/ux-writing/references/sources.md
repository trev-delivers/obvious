# Sources

Every source was read on 2026-10-18. Tags match the brackets used in the
other reference files. Where a page carries its own date, it's given.

## Accessibility standards (W3C)

- **[WCAG22]** Web Content Accessibility Guidelines (WCAG) 2.2. W3C
  Recommendation. https://www.w3.org/TR/WCAG22/
  Names and levels of 1.1.1, 1.3.3, 1.4.1, 2.4.2, 2.4.4, 2.4.6, 3.1.1,
  3.1.2, 3.2.4, 3.3.1, 3.3.2, 3.3.3 and 4.1.2 in `accessibility-text.md`.
- **[WCAG-new22]** What's New in WCAG 2.2. W3C WAI.
  https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
  Published 5 October 2023; 9 new criteria; 4.1.1 Parsing obsolete and
  removed; WCAG 3 listed as a draft.
- **[WCAG-2.5.3]** Understanding SC 2.5.3 Label in Name. W3C WAI.
  https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html
  Accessible name contains the visible label, best at the start; case and
  punctuation don't matter; icon symbols aren't labels.
- **[WCAG-3.1.5]** Understanding SC 3.1.5 Reading Level. W3C WAI.
  https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html
  Level AAA; lower secondary education level (7 to 9 years of school); no
  reliable test for clarity was found, hence reading level.
- **[WCAG-3.2.4]** Understanding SC 3.2.4 Consistent Identification. W3C
  WAI. https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html
  Same function, same identification across pages: the basis for the term
  list.
- **[WCAG-4.1.3]** Understanding SC 4.1.3 Status Messages. W3C WAI.
  https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
  Examples of status messages; `role="status"` and `role="alert"`.
- **[W3C-alt]** An alt Decision Tree. W3C WAI Images Tutorial. Updated
  13 May 2024. https://www.w3.org/WAI/tutorials/images/decision-tree/
  The order of questions for alt text; empty alt for decorative and
  repeated images; describe function for images in links and buttons.
- **[APG-names]** Providing Accessible Names and Descriptions. WAI-ARIA
  Authoring Practices Guide, W3C.
  https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/
  Function over form, distinguishing word first, 1 to 3 words, no role in
  the name, capital first and no full stop, prefer visible text, no names
  on generic elements.
- **[W3C-textsize]** Text size in translation. W3C Internationalization.
  https://www.w3.org/International/articles/article-text-size
  IBM's expansion table by string length (with the W3C's note that one row
  may be a typo), vertical space for non-Latin scripts, CJK width, no
  abbreviations to make text fit, room in data fields.

## Government content design

- **[GDS-language]** Use clear language. GOV.UK writing guidelines,
  Government Digital Service.
  https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/
  Plain English mandatory; split sentences over 25 words; paragraphs of 5
  sentences or fewer; 80% preferred clear English, more so for specialists;
  literacy figures; short words; -ion and -ment; must, need, can;
  contractions guidance.
- **[GDS-structure]** Use a clear structure. GOV.UK writing guidelines.
  https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-structure/
  People read 20 to 28% of a page (citing NN/g); F-shaped scanning;
  front-loading and the inverted pyramid; headings that are descriptive,
  front-loaded and not questions.
- **[GDS-archive]** Writing for GOV.UK (version of 5 May 2022, via
  govdiff). https://govdiff.njk.onl/update/2022-05-05T11:26:00+01:00/www.gov.uk/guidance/content-design/writing-for-gov-uk
  The earlier reading age of 9 target, word recognition by shape, long
  words making readers skip short ones. The live page now redirects to the
  guidance above, so these points are cited as the earlier guidance.
- **[GDS-error]** Error message. GOV.UK Design System.
  https://design-system.service.gov.uk/components/error-message/
  What went wrong and how to fix it; match the label's words; same text in
  the summary and by the field; don't clear fields; words to avoid
  (please, sorry, valid, invalid, forbidden, oops); hidden "Error:" prefix.
- **[GDS-textinput]** Text input. GOV.UK Design System.
  https://design-system.service.gov.uk/components/text-input/
  Visible labels above fields with no colon; hints as 1 short sentence with
  no links; no placeholder instead of a label or hint; error templates for
  empty, too long, too short and wrong characters.
- **[GDS-disability]** Inclusive language: words to use and avoid when
  writing about disability. GOV.UK, Disability Unit. Updated 17 June 2026.
  https://www.gov.uk/government/publications/inclusive-communication/inclusive-language-words-to-use-and-avoid-when-writing-about-disability
  "Disabled people"; wheelchair user; has [condition]; non-disabled;
  accessible parking; idioms that link impairment with negatives.
- **[Digital.gov-writing]** Plain language guide: writing. Digital.gov
  (US General Services Administration; content adapted from
  PlainLanguage.gov). https://digital.gov/guides/plain-language/writing
  Active voice, "you" and "must", present tense, hidden verbs.
- **[Digital.gov-test]** Plain language guide: test. Digital.gov.
  https://digital.gov/guides/plain-language/test
  Paraphrase testing, usability testing, controlled comparative studies.
- **[Canada-readability]** Readability formulas, programs and tools: Do they
  work for plain language? Gael Spivak, Language Portal of Canada blog.
  https://www.noslangues-ourlanguages.gc.ca/en/blogue-blog/readability-formulas-eng
  Lowering a readability score doesn't raise comprehension; the ISO
  plain-language standard's experts didn't endorse formulas; test with
  readers. (The author's views, as the portal notes.)

## Research and practitioner guidance

- **[NNg-errors]** Error-Message Guidelines. Tim Neusesser and Evan
  Sunwall, Nielsen Norman Group, 14 May 2023.
  https://www.nngroup.com/articles/error-message-guidelines/
  Visibility near the problem, not colour alone, don't show errors too
  early, plain language, constructive advice, no blame words, no humour,
  keep the input.
- **[NNg-confirm]** Confirmation Dialogs Can Prevent User Errors (If Not
  Overused). Jakob Nielsen, Nielsen Norman Group, 18 February 2018,
  reviewed 7 August 2026. https://www.nngroup.com/articles/confirmation-dialog/
  Confirm only serious, irreversible actions; be specific; outcome labels
  instead of Yes and No; typed confirmation for rare high stakes; undo.
- **[NNg-empty]** Designing Empty States in Complex Applications: 3
  Guidelines. Kate Kaplan, Nielsen Norman Group, 19 September 2021.
  https://www.nngroup.com/articles/empty-state-interface-design/
  System status, learnability, direct pathways; don't show "no items"
  while loading.
- **[NNg-placeholders]** Placeholders in Form Fields Are Harmful. Katie
  Sherwin, Nielsen Norman Group, 11 May 2014, reviewed 10 September 2018.
  https://www.nngroup.com/articles/form-design-placeholders/
  Seven problems with placeholder text used as labels, plus contrast and
  screen reader issues.
- **[NNg-learnmore]** "Learn More" Links: You Can Do Better. Katie
  Sherwin, Nielsen Norman Group, 13 December 2015.
  https://www.nngroup.com/articles/learn-more-links/
  Generic link text creates uncertainty and fails out of context; describe
  the destination with front-loaded words.
- **[NNg-first2]** First 2 Words: A Signal for the Scanning Eye. Jakob
  Nielsen, Nielsen Norman Group, 6 April 2009.
  https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/
  The 11-character study: 80 participants; 35% of truncated links gave no
  idea of their destination; front-load specific words.
- **[NNg-read]** How Little Do Users Read? Jakob Nielsen, Nielsen Norman
  Group, 5 May 2008. https://www.nngroup.com/articles/how-little-do-users-read/
  At most 28% of words read on an average visit, 20% more likely.
- **[Atlassian-errors]** Error messages. Atlassian Design System, content
  guidelines. https://atlassian.design/foundations/content/designing-messages/error-messages
  Title, body and action structure; don't invent a cause; lead with the
  likeliest fix and offer a fallback; "we" over "you"; avoid please and
  sorry.
- **[Mailchimp-a11y]** Writing for Accessibility. Mailchimp Content Style
  Guide. https://styleguide.mailchimp.com/writing-for-accessibility/
  Link text, no directional language, plain language, headings in order,
  alt text by purpose.
- **[Mailchimp-voice]** Voice and Tone. Mailchimp Content Style Guide.
  https://styleguide.mailchimp.com/voice-and-tone/
  Voice stays the same while tone shifts with the reader's state; clarity
  before entertainment.
- **[Roselli-arialabel]** aria-label Does Not Translate. Adrian Roselli,
  November 2019, updated 25 July 2025.
  https://adrianroselli.com/2019/11/aria-label-does-not-translate.html
  Browser and service translation of aria-label is unreliable; prefer
  visible text, aria-labelledby or hidden text in the page.

## Platform and company style guides

- **[Apple-writing]** Writing. Apple Human Interface Guidelines. Changed
  16 December 2025.
  https://developer.apple.com/design/human-interface-guidelines/writing
  Voice and tone; term list; verbs on buttons; descriptive links; Get
  started, Continue or Next, Done; avoid "we" in errors; device verbs;
  empty states; errors near the problem with the fix; settings described
  by their on state; link straight to settings.
- **[Apple-alerts]** Alerts. Apple Human Interface Guidelines.
  https://developer.apple.com/design/human-interface-guidelines/alerts
  Use alerts sparingly; not for undoable actions; titles that describe the
  situation; specific button titles over OK; "Cancel" for cancel; don't
  explain buttons.
- **[Apple-notifications]** Notifications. Apple Human Interface
  Guidelines. https://developer.apple.com/design/human-interface-guidelines/notifications
  Concise; no duplicates; no instructions to go and do things; errors use
  alerts; no sensitive details; generic preview text; no app name.
- **[Apple-privacy]** Privacy. Apple Human Interface Guidelines.
  https://developer.apple.com/design/human-interface-guidelines/privacy
  Ask when needed; purpose strings as brief, complete, active sentences
  with examples; pre-alert screens with 1 "Continue" or "Next" button and
  no "Allow"; no incentives.
- **[Apple-inclusion]** Inclusion. Apple Human Interface Guidelines.
  https://developer.apple.com/design/human-interface-guidelines/inclusion
  "You" over "the user"; "we" for the company; define specialist terms;
  replace colloquial phrases; care with humour; gender-neutral copy and
  translation.
- **[MS-global]** Writing tips (Global communications). Microsoft Writing
  Style Guide. Page dated 14 June 2023.
  https://learn.microsoft.com/en-us/style-guide/global-communications/writing-tips
  Short sentences; keep that, who and articles; verbs in short labels;
  no idioms or modifier stacks; one word per concept; -ing and -ed words.
- **[MS-bias]** Bias-free communication. Microsoft Writing Style Guide.
  Page dated 18 April 2024.
  https://learn.microsoft.com/en-us/style-guide/bias-free-communication
  Gender-neutral nouns and pronouns; real people's own pronouns; diverse
  examples; primary and subordinate; people-first disability language; no
  appropriative slang.
- **[IBM-messages]** Writing messages (AIX globalization). IBM
  Documentation. https://www.ibm.com/docs/en/ssw_aix_72/globalization/write_msg.html
  Allow 20 to 30% more space for translated messages, up to 100% in some
  cases; don't build messages by concatenation; numbered placeholders.
- **[Mozilla-l10n]** Localization best practices for developers. Mozilla
  Localization Documentation.
  https://mozilla-l10n.github.io/documentation/localization/dev_best_practices.html
  No concatenation; placeholders that can move; plural forms; comments for
  localizers; don't reuse strings across contexts; don't split sentences;
  don't hard-code separators or date formats; gender agreement.
- **[CLDR-plurals]** Language Plural Rules. Unicode CLDR.
  https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
  Cardinal plural categories: English 2, Polish and Russian 4, Arabic 6,
  Japanese 1.
- **[MDN-pluralrules]** Intl.PluralRules. MDN Web Docs.
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules
  Plural category selection in plain JS (zero, one, two, few, many, other).
- **[MDN-intl]** Intl. MDN Web Docs.
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
  DateTimeFormat, NumberFormat, RelativeTimeFormat and ListFormat for
  locale-aware formatting.

## Books

- **[CDL-book]** Content Design, second edition. Sarah Winters (formerly
  Richards) and Rachel Edwards. Content Design London.
  https://contentdesign.london/store/the-content-design-book
  Chapter list read from the publisher's page: the science of reading,
  user and job stories, journey mapping, writing, pair writing and crits.
  Supports the testing and pair-writing advice in `readability.md`. The
  book itself wasn't read for this skill.
- **[Podmajersky]** Strategic Writing for UX, second edition. Torrey
  Podmajersky. O'Reilly, 2025. Listing:
  https://www.oreilly.com/library/view/strategic-writing-for/9781098174323/
  Voice chart rows (product principles, concepts, vocabulary, verbosity,
  grammar, punctuation and capitalisation) as described by VTEX's UX
  writing docs, which quote the book:
  https://uxwriting.vtex.com/docs/principles/voice-chart/
  The publisher page couldn't be fetched (403); edition and date are from
  retailer listings. Supports the voice guide advice in SKILL.md.

## Skill format

- **[Anthropic-skills]** Skill authoring best practices. Anthropic.
  https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
  Frontmatter rules, a third-person description with triggers, SKILL.md
  short with references one level deep, contents lists in long references,
  scripts for deterministic work, checklists and feedback loops.

## Grounding in obvious

Not external sources, but read for this skill: obvious's `CLAUDE.md`
(design rules), `README.md`, `src/primitives.json` (`--ds-control-*`,
`--ds-measure`), `src/components/field.css` (`.t-error-msg`),
`registry/obvious/Toasts.tsx` (2.8 s and 6 s timeouts, `role` by tone),
`registry/obvious/motion.tsx` (`label` props as accessible names), the
engineer skill's `references/standards/accessibility.md` and `design.md`,
and the `write-like-trev` skill.
