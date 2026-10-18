# Patterns

One section per kind of string. Each has the rule, a template where one
helps, and a before and after. Source tags in brackets point to
`sources.md`.

## Contents

- Buttons
- Links
- Labels, hints and placeholders
- Error messages
- Empty states
- Confirmations and destructive actions
- Success messages and toasts
- Loading and progress
- Onboarding
- Notifications
- Permission requests
- Settings and toggles
- Page titles and headings

## Buttons

- Start with a verb and say what happens: "Save note", "Send invite",
  "Delete list". A verb alone is fine when the object is obvious from the
  screen ("Send" under a message) [Apple-writing].
- 1 to 3 words. Over 4 usually means the button is explaining itself; move
  the explanation to the text above it.
- Avoid "OK", "Yes", "No" and "Submit" when a specific verb exists. "OK"
  can mean "do it" or "I understand", and people click through dialogs on
  autopilot [Apple-alerts] [NNg-confirm].
- In a dialog, the button repeats the verb in the title: title "Delete this
  list?", button "Delete list".
- The cancel button is "Cancel" [Apple-alerts]. Don't make it the default.
- In multi-step flows, pick one pair and keep it: "Continue" or "Next" to
  move on, "Done" at the end [Apple-writing].
- A button that waits shows its pending state in words ("Saving..."), then
  the result. The label shouldn't change meaning while someone's about to
  press it.
- Before: "Submit". After: "Send application".

## Links

- The link text says where it goes or what it does, read on its own. Screen
  reader users often pull up a list of links with no surrounding text
  [NNg-learnmore] [WCAG22].
- Front-load the topic: "Delivery times and costs", not "Click here to read
  about delivery times" [NNg-first2].
- No "click here", "here", "read more" or "learn more" alone. If a "Learn
  more" has to stay, add the topic: "Learn more about delivery"
  [NNg-learnmore] [Mailchimp-a11y].
- Several links with the same text should go to the same place.
- Say when a link opens something unexpected: a download ("Price list (PDF,
  2 MB)") or a new tab.
- Before: "To change your plan, click here." After: "Change your plan".

## Labels, hints and placeholders

- Every field has a visible label above it. Short noun or noun phrase, no
  colon at the end [GDS-textinput].
- Ask for what you mean in the person's words: "Name on card", not "Card
  holder".
- A hint goes between the label and the field, as 1 short sentence, and is
  connected to the field so screen readers read it [GDS-textinput].
- Don't put links in hints; screen readers often don't say they're links
  [GDS-textinput].
- Placeholders vanish when typing starts, are often low contrast, aren't
  read by every screen reader, and get mistaken for filled-in answers. Use
  one for an example format at most, and never as the label
  [NNg-placeholders] [GDS-textinput].
- Mark optional fields "(optional)" rather than marking every required one,
  when most are required. Follow whatever the product already does.
- Before: placeholder "Email" in an unlabelled field. After: label "Email
  address", hint "We'll send your receipt here".

## Error messages

The person has hit a problem. The message has 3 jobs: say what went wrong,
say how to fix it, and keep their work [GDS-error] [NNg-errors].

### Field errors (something the person typed or chose)

- Show it next to the field and keep it there until it's fixed. Don't rely
  on colour or an icon alone [NNg-errors] [WCAG22].
- Use the field's own words, so the message matches the label: label "Date
  of birth", error "Enter your date of birth" [GDS-error].
- Say what's acceptable: "Enter a date in the past", "Password must be 8
  characters or more". The fix is in the message [WCAG22].
- If there's a summary at the top of a form, use the same wording there as
  next to the field [GDS-error].
- Don't show the error before they've had a chance: leaving an empty field
  isn't a mistake [NNg-errors].
- Don't clear what they typed, right or wrong [GDS-error] [NNg-errors].
- Don't repeat an example that's already in the hint [GDS-error].

Templates that work in most products, adapted from GOV.UK [GDS-textinput]:

| Problem | Template | Example |
|---|---|---|
| Empty | Enter [thing] / Select [thing] | "Enter your postcode" |
| Too long | [Thing] must be [n] characters or less | "Name must be 35 characters or less" |
| Too short | [Thing] must be [n] characters or more | "Password must be 8 characters or more" |
| Wrong characters | [Thing] must only include [allowed] | "Phone number must only include numbers" |
| Wrong format | Enter [thing] in the right format, or say the format | "Enter a date, like 27 3 2026" |
| Out of range | [Thing] must be [rule] | "Start date must be today or later" |

### System errors (something the product couldn't do)

- Say what happened in plain words, what it means for them, and what to do
  next. If the cause is unknown, don't invent one; say what didn't happen
  and offer a next step [Atlassian-errors].
- Lead with the likeliest fix, then a fallback ("Try again. If it keeps
  happening, contact support.") [Atlassian-errors].
- Error codes go after the message, for support, if at all [NNg-errors].
- Use an alert or inline message for errors. A notification is the wrong
  container for an error in the app [Apple-notifications].

### Tone in errors

- No blame. Avoid "invalid", "illegal", "forbidden", "incorrect", "you
  forgot" [GDS-error] [NNg-errors].
- No "oops", "uh oh" or jokes. Humour wears thin when the same error comes
  back and can read as not taking the problem seriously [NNg-errors]
  [Apple-writing].
- "Please" and "sorry": GOV.UK and Atlassian both avoid them, because
  "please" makes a required step sound optional and "sorry" doesn't help
  fix anything [GDS-error] [Atlassian-errors]. A product's voice guide may
  allow an apology for a serious failure that's the product's fault.
- "We": guides disagree. Atlassian prefers "we" to avoid pinning the
  problem on the person; Apple says avoid "we" because it's unclear who
  "we" is [Atlassian-errors] [Apple-writing]. Follow the voice guide.
  Without one, use "we" only when the product really did the thing, and
  never to blame the person ("you entered").

Before: "Error: invalid input." After: "Enter a quantity between 1 and 99".
Before: "Something went wrong." After: "Your changes weren't saved. Check
your connection and try again."

## Empty states

- Say why it's empty and what fills it, and give the action as a button or
  link [NNg-empty] [Apple-writing].
- Distinguish the 3 kinds: nothing yet (first use), nothing found (a search
  or filter), and cleared (everything done). Each needs different words.
- Don't show "No items" while content is still loading; people will think
  there's nothing and leave [NNg-empty].
- Don't put anything essential in an empty state. It disappears once the
  first item is added [Apple-writing].
- A light touch of voice can fit here if the product's voice allows it. It
  never replaces the action.
- Before: "No data." After: "No saved recipes yet" + button "Find a
  recipe". For a search: "No recipes match 'kale'. Try fewer words."

## Confirmations and destructive actions

- Only confirm actions that are serious and can't be undone. Confirming
  routine actions teaches people to click through [NNg-confirm]
  [Apple-alerts].
- Offer undo instead where you can. It's kinder and catches mistakes a
  dialog misses [NNg-confirm].
- Title names the action and the thing: "Delete 'Weekend bakes'?"
- Body says the consequence in 1 or 2 sentences: "This deletes the list and
  its 14 recipes. You can't undo this."
- Buttons describe the outcome: "Delete list" and "Cancel". Not "Yes" and
  "No" [NNg-confirm] [Apple-alerts].
- For bulk actions, give the count and enough detail to spot a mistake
  [NNg-confirm].
- For rare, very high-stakes actions, asking the person to type the name is
  justified. Don't use it for everyday deletes [NNg-confirm].
- Don't explain the buttons in the body if their labels are clear
  [Apple-alerts].

## Success messages and toasts

- Past tense, name the thing: "Recipe saved", "Invite sent to Sam". No
  "Success!".
- Only confirm what isn't already visible. If the item appears in the list,
  a toast adds little.
- Toasts disappear. Anything the person has to read slowly or act on
  belongs on the page. Errors that need a fix don't go in a toast.
- Status messages need to reach screen readers without moving focus
  (`role="status"`, or `role="alert"` for errors) [WCAG-4.1.3].
- An undo in a toast needs to stay long enough to use, and be reachable by
  keyboard.

## Loading and progress

- Say what's happening if it takes more than a moment: "Loading your
  orders", "Uploading 3 of 12".
- Be honest about time. Don't promise "a few seconds" without knowing.
- Cycling loading phrases are a voice choice. Keep them short and never use
  them to stall over a failure; when something fails, switch to an error.
- Announce the end, not every step. A live region that updates every tick
  chatters.

## Onboarding

- Teach in context, at the moment a feature is needed, over front-loaded
  tours. Empty states are often the best place [NNg-empty].
- Make it skippable, and let people come back to it.
- 1 idea per screen. Lead with what the person gets, then what to do.
- Ask for permissions and personal details when they're needed, not on the
  first screen (see Permission requests).
- Consistent step buttons: "Get started" to begin, "Continue" or "Next" in
  the middle, "Done" at the end [Apple-writing].

## Notifications

- Useful on their own, at a glance. Lead with the news: "Your order is out
  for delivery", not "Update from Shop".
- Don't send several for the same thing, and don't tell people to go and do
  something in the app; offer an action in the notification if it's simple
  [Apple-notifications].
- Leave out private details. Lock screens are seen by others
  [Apple-notifications].
- Write a generic version for when previews are hidden ("New comment",
  "Reminder") [Apple-notifications].
- Don't repeat the app name; the system shows it [Apple-notifications].
- Use sentence case and full punctuation in the body; let the system
  truncate [Apple-notifications].

## Permission requests

- Ask when the person uses the feature that needs it. Asking at launch only
  makes sense when the app can't work without it (a map needs location)
  [Apple-privacy].
- The purpose string is 1 short, complete, active sentence saying how the
  app uses the data: "The app records during the night to detect snoring."
  Avoid vague ("for a better experience") and imperative ("Turn on
  microphone access") strings [Apple-privacy].
- A screen before the system prompt has 1 button, labelled "Continue" or
  "Next", never "Allow", and no way to skip the prompt. Don't offer rewards
  for saying yes [Apple-privacy].
- If someone says no, the feature still explains itself and offers a way to
  change the setting later, with a direct link rather than directions to
  find it [Apple-writing].

## Settings and toggles

- Label the setting by what it does when on: "Show prices", not "Hide
  prices: off" or "Disable price hiding". People infer the off state
  [Apple-writing].
- Add a 1-line description only when the label can't carry it.
- The control's accessible name is the label. A switch announced as "Show
  prices, switch, on" should read as a complete thought.
- If you send someone to a setting, link straight to it [Apple-writing].
- Group names are nouns ("Notifications", "Privacy").

## Page titles and headings

- Page titles name the page then the product: "Orders - Shop". Unique per
  page; it's the first thing a screen reader says and what shows in tabs
  [WCAG22]. (Use whatever separator the product uses; the voice guide
  may ban dashes.)
- Headings say what's in the section, front-loaded, in sentence case. Not
  questions, not "Introduction" [GDS-structure].
- Headings and labels describe their topic or purpose [WCAG22].
