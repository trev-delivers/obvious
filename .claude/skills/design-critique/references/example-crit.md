# A worked example

An illustration of the shape and the level of detail, for a made-up recipe
app. The app, screens and findings are invented to show the format; none
of it describes a real product.

## Example

```
Critique: recipe list, add-recipe sheet and recipe page
Assumed goal, user and task (assumed, from the README):
  Goal: get a recipe saved and find it again at the stove.
  User: someone cooking at home, on a phone, often with messy hands.
  Task: add a recipe from a link; open it later and follow the steps.
Looked at: 3 screens at 390 and 1280, light and dark; empty list, loading,
  failed save and a 40-character recipe name; the add flow end to end.

Findings, worst first

1. A failed save loses the recipe (Blocks)
   Where: add-recipe sheet, any width, when saving fails
     (recipes-390-light-step-save-failed.png)
   What happens: the sheet closes and a toast says "Error" for 3 seconds.
     The pasted link and the edited title are gone, so the person starts
     again, if they noticed at all.
   Why it matters: help users recognise, diagnose and recover from errors.
     The message has to stay and the input has to survive.
   Try: keep the sheet open, put the message under the Save button in
     plain words ("Couldn't save. Check your connection and try again."),
     and keep everything typed.

2. Steps are too small to follow at the stove (Hurts)
   Where: recipe page at 390 (recipe-390-light-fold.png)
   What happens: the steps are 13px in the muted text colour. At arm's
     length they're hard to read, and in dark mode they measure about
     3.9:1.
   Why it matters: WCAG 1.4.3 asks for 4.5:1, and the task is reading
     from a distance.
   Try: set steps in the body role (17px, 1.6 leading) in the main text
     colour, and keep the muted colour for metadata.

3. Two equal buttons on the list (Snags)
   Where: list header, both widths (recipes-1280-light-fold.png)
   What happens: "Add recipe" and "Import" are the same size and colour,
     so neither reads as the main action.
   Why it matters: similarity; things that look the same read as equally
     important.
   Try: keep Add recipe in the accent; make Import a secondary button or
     move it into the add sheet.

4. Empty list is a blank page (Snags)
   Where: list, first use (recipes-390-light-step-empty.png)
   What happens: a heading and nothing else. It looks like it's still
     loading.
   Why it matters: visibility of system status; an empty state should say
     why it's empty and offer the way to fill it.
   Try: one line ("No recipes yet.") and the Add recipe button right
     there.

What's working
- The add sheet uses the registry Sheet, so it closes on back and on a
  swipe, the way people expect on a phone.
- Recipe titles wrap cleanly at 40 characters with no sideways scroll.
- Spacing sits on the scale throughout; the list has an even rhythm.

Taste notes (not problems)
- I'd drop the photo on list rows at 390; text alone would fit more
  recipes on a screen. Nothing measurable suffers as it is.

Not reviewed
- Signed-in sync between devices: no test account available.
- Motion on the sheet: captured as stills only.
```

## Notes on the example

- The assumptions are at the top and marked, so they can be corrected
  before anyone argues about finding 3.
- Each finding has one cause. The muted colour shows up elsewhere too, but
  it's a finding only where it hurts the task.
- The principle is named once, in a few words. No paragraph on Gestalt.
- "Try" uses the system: a type role, a colour, a registry component.
- "What's working" is specific enough to protect those things in a
  redesign.
- No code, no class names, no file paths beyond the screenshot names.
