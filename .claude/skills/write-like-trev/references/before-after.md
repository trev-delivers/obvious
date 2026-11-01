# Before and after

Rewrites in Trev's world. Every fact in an "after" comes from his repos or his site, and each says where. Anything made up to show a shape is marked "(example)". Where a real piece would need something only Trev knows, the gap is left as a note to ask him, which is what an agent should do too.

The "before" drafts sit between `copy-check` markers so the checker skips them.

## 1. Blog intro: a pixel game

<!-- copy-check: off -->
Before:

> In the ever-evolving landscape of indie games, Smuggle Brawlers stands as a testament to what's possible when passion meets technology. It's not just a game — it's a love letter to pixel art, a celebration of community, and a bold experiment in AI-assisted development. Let's dive in!
<!-- copy-check: on -->

After:

> Smuggle Brawlers is a beat 'em up made from my pixel art of Jesse Moynihan's Jesus 2. The characters started as emoji reactions in Discord, which is why they're so small. Claude wrote the code and I reviewed it. I did the art and the design.

What changed: it says what the game is in the first sentence, and the one odd detail (emoji reactions) does the work the adjectives were trying to do. Facts from the Smuggle Brawlers write-up in obvious's history (commit e969dc3).

## 2. Blog intro: the first game

<!-- copy-check: off -->
Before:

> What happens when four friends decide to become the Four Horsemen of the Apocalypse? Welcome to 4HM — a nostalgic, action-packed, side-scrolling brawler that brings our friendship to life, one pixel at a time.
<!-- copy-check: on -->

After:

> 4HM is my first pixel-art game: a side-scrolling brawler with the 4 of us as the horsemen. It runs in a browser at 4hm-the-game.vercel.app.

What changed: the rhetorical question, the dash, the triple and "one pixel at a time" are gone, and the address is in. Nothing about what's coming, because the game has surprises in it. Facts from 4hm-the-game's CLAUDE.md and README.

## 3. Case study: a decision

<!-- copy-check: off -->
Before:

> Faced with plateauing adoption, I made the pivotal decision to resist the allure of a shiny v2. Rather than fragmenting the codebase, I championed a more holistic approach — one that prioritized removing friction and fostering trust across teams.
<!-- copy-check: on -->

After:

> The tempting fix for flat adoption is a shiny new version. I argued against it. A v2 next to a v1 splits the codebase and gives every team a reason to wait. We fixed what was in people's way instead.

What changed: the option, the trade-off and what happened, in short plain sentences, with "I" for his argument and "we" for the team's fix. This is the "No v2" section of the live Cleonardo case study (designedbytrev `work/cleonardo.html`).

## 4. Case study: a result

<!-- copy-check: off -->
Before:

> The redesigned credit score widget delivered transformative results, significantly boosting engagement while maintaining key business metrics, underscoring the value of a user-centred approach.
<!-- copy-check: on -->

After:

> Visits to credit score went up 45.7% and adoption went up 10.8%, with no harm to cash advance, referrals or upgrades. One thing went the other way: people who already used their score came back 34% less, so I designed a one-time tooltip to point them to its new home.

What changed: real numbers with what they measured, and the result that went the wrong way, which is what makes the rest believable. From `work/information-architecture.html`.

## 5. A button and its error

<!-- copy-check: off -->
Before:

> Button: "Click here to copy link"
> Error: "Oops! Something went wrong. We were unable to copy the link to your clipboard. Please try again later."
<!-- copy-check: on -->

After:

> Button: "Copy link"
> Error: "Couldn't copy it. Press and hold the link instead."

What changed: the button is a verb and a noun. The error says what happened and gives a way round it that works now, with no "Oops" and no "try again later". From Morris OS (`components/`).

## 6. A destructive action

<!-- copy-check: off -->
Before:

> Title: "Are you sure?"
> Body: "This action cannot be undone. Proceeding will permanently remove this item from your inventory."
> Buttons: "OK" / "Cancel"
<!-- copy-check: on -->

After:

> Title: "Delete oat milk?" (example item)
> Body: "It comes off stock and the shop list for good."
> Buttons: "Delete" / "Cancel"

What changed: the title names the thing, the body names both places it leaves, and "for good" says "permanently" the way a person would. The body line is Morris OS's own; the item is an example.

## 7. An empty state

<!-- copy-check: off -->
Before:

> "Your shopping list is empty! 🎉 Looks like you're all stocked up. Why not take a moment to plan your next meal?"
<!-- copy-check: on -->

After:

> "Nothing needs buying. Nice."

What changed: one fact and one dry word. No emoji, no exclamation mark, no suggestion nobody asked for. From Morris OS.

## 8. README intro: an app

<!-- copy-check: off -->
Before:

> # Ritual ✨
> Ritual is a beautifully designed, privacy-first skincare companion that seamlessly adapts to your day. Key features:
> - **Smart Scheduling**: Morning and evening routines
> - **Adaptive Theming**: Colors that evolve with time
> - **Shareable**: Share your routine with friends
<!-- copy-check: on -->

After:

> # Ritual
> A skincare routine you tick off twice a day. Morning and night are 2 cards, the ticks clear themselves overnight, and the colours follow the clock from dawn to dark. Product names link out to where to buy.
>
> Everything saves to the device. There's no account and no server.

What changed: the bold-label bullets became 2 sentences that say what it does; "privacy-first" became the fact behind it. Adapted from daily-routine's README (which says "two cards"; numerals here).

## 9. README intro: a learning site

<!-- copy-check: off -->
Before:

> Eye for Type is an interactive platform designed to empower designers to elevate their typographic skills. Whether you're a beginner or a seasoned pro, our engaging lessons will help you master the art of typography.
<!-- copy-check: on -->

After:

> Learn to see typography: hands-on lessons in kerning, leading, measure, word spacing and rag. Each lesson has a Learn mode with guidance and a Practise mode that takes the guidance away and scores your judgement.

What changed: it lists the actual lessons and says how the 2 modes differ. ~~Whether you're a beginner or a seasoned pro~~ says nothing. From eye-for-type's README.

## 10. Commit message: a game with surprises

<!-- copy-check: off -->
Before:

> feat: add Enlightened Monday outfit with floating animation and Force push ability 🧘
<!-- copy-check: on -->

After:

> Menu tweaks
>
> (Body, if needed, says what changed in the code without naming the surprise. Example: "Moves the outfit list into its own file and adds a test that every outfit loads.")

What changed: holy-pixels' CLAUDE.md keeps commit titles generic because GitHub shows them and some of what goes in is a surprise. No emoji, no prefix. The body is an example.

## 11. Commit message: a fix

<!-- copy-check: off -->
Before:

> Fix: Resolved an issue where ticks were being cleared at an incorrect time, ensuring a more consistent and reliable user experience.
<!-- copy-check: on -->

After:

> Clear ticks at 4am, when the night card goes
>
> Ticks cleared at midnight, but the night card stays up until 4am, so the night card lost its ticks while it was still showing. Both now use DAY_STARTS_AT.

What changed: the subject says what the change does; the body says what was wrong and how it's fixed. The subject is daily-routine's real commit; the body follows the "day boundary" note in its CLAUDE.md.

## 12. PR description

<!-- copy-check: off -->
Before:

> ## Summary
> This PR introduces a robust caching layer to optimize Home Connect API usage, ensuring we stay well within rate limits while delivering a seamless experience. 🚀
>
> ## Changes
> - **Caching**: Added caching
> - **Polling**: Adjusted polling
>
> Let me know if you have any questions!
<!-- copy-check: on -->

After (example):

> Keeps each dishwasher read for 30 seconds on the server, and House asks once a minute while it's on screen. Home Connect allows 1000 calls a day, and with 2 phones open we were near it by teatime.
>
> Worth checking: the panel still shows "Finished" straight away when a programme ends, because that comes from the event stream and skips the cache.

What changed: what it does, why, and what a reviewer should look at, with no headings for a 3-line PR and no sign-off. The 30 seconds, once a minute and 1000 calls are from Morris OS's README and CLAUDE.md; the "by teatime" reason and the event-stream detail are made up for the example. A real PR needs the real reason.

## 13. A post about something away from the screen

The Brookwood Christmas Hunt is a trail round the village: 22 houses put a poster in the window with a Christmas song spelt out in emoji (brookwood-hunt README).

<!-- copy-check: off -->
Before:

> There's something truly magical about the holidays in a small village. As twinkling lights illuminate frosty windows, neighbours come together to create cherished memories. This year, I wanted to capture that spirit — and the Brookwood Christmas Hunt was born.
<!-- copy-check: on -->

After:

> 22 houses in Brookwood put a poster in their window with a Christmas song spelt out in emoji. You walk round, find the house, work out the song and type it in. There's no leaderboard and no sign-up. Progress saves to your phone, so you can stop partway (rain, tired legs, tea) and pick it up later.
>
> (Ask Trev: why he made it, and anything about the first year. Don't write it for him.)

What changed: the scene-setting and the feelings are gone, because they were invented. What's left is from the README, including its own aside in brackets. The reason he made it is the part only he can give.

## 14. A post about sauce

<!-- copy-check: off -->
Before:

> For me and my friends, condiments are more than just toppings — they're a passion. From fiery hot sauces to tangy mustards, we've embarked on a flavourful journey, and Condimental is where we document every delicious discovery.
<!-- copy-check: on -->

After:

> My friends and I have opinions about sauce, so I made somewhere to keep them. You add a condiment as a 3D bottle in its own colours, sized to match the real thing, and rate it on flavour, aroma and versatility.
>
> (Ask Trev: which sauce started it, and who's the harshest marker. Those are the lines that make it his.)

What changed: ~~more than just toppings~~ and the ~~journey~~ are gone, and so is the made-up range of sauces. The first sentence is the Condimental README's; the second is adapted from it.

## 15. A theme note

<!-- copy-check: off -->
Before:

> Ritual. The only one that moves: the palette is a ramp through the day, worked out from the clock, so it is warm at dawn, plain at noon and dark by bedtime. These values are the 10am stop, which is what paints before the JavaScript has read the time.
<!-- copy-check: on -->

After:

> For the skincare app. It's meant to be used every morning and every evening, so the colours follow the clock and it goes dark at night when the glare is all too much. What you see here is the 10am set, which is what shows before the app has checked the time.

What changed: it reads as Trev telling you what it's for, using his own phrase ("when the glare is all too much"), instead of the system describing itself. From the old skill, where Trev approved it.

## 16. The portfolio hero

<!-- copy-check: off -->
Before:

> I'm a passionate product designer who crafts intuitive, delightful experiences that empower users and drive business value.
<!-- copy-check: on -->

After:

> Staff Product Designer at Cleo. 13 years across fintech, broadcast and consumer apps.

What changed: job, company and years. No adjectives about himself. The live designedbytrev.com line.
