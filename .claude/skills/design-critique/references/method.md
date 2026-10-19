# Critique practice

The thinking behind the procedure in SKILL.md, for when a judgement call
comes up. Sources for each point are in `sources.md`.

## Contents

1. What a critique is for
2. Critique, reaction and direction
3. Two passes, and why the goal comes first
4. Severity
5. Problem or taste
6. Phrasing a finding
7. What critique can't tell you

## 1. What a critique is for

A critique analyses a design against what it's meant to achieve. NN/g
defines it as a conversation about whether a design meets its objectives,
with the aim of improving it rather than judging it. Adam Connor and Aaron
Irizarry (Discussing Design) describe it as comparing a design with the
objectives it set out to meet. Jared Spool puts the 2 questions as "What is
it we're really trying to do here?" and "How close are we to doing it?"

So the goal, user and task come before any finding. Without them every
comment is an opinion.

## 2. Critique, reaction and direction

Connor and Irizarry separate 3 kinds of feedback:

- **Reaction:** a gut response with no context ("I don't like it").
- **Direction:** jumping straight to a fix ("make it blue").
- **Critique:** analysis against the objective: what's it for, what in the
  design relates to that, is it working, and why or why not.

A finding in this skill is always a critique. The "Try" line is allowed to
suggest a direction, but only after the critique has said what's wrong and
why. If you notice yourself writing a reaction, either find the reason
behind it (which turns it into a critique) or move it to taste notes.

## 3. Two passes, and why the goal comes first

NN/g's heuristic evaluation method uses 2 passes: one to learn the
interface by using it, one to look for problems against the heuristics.
The first pass in this skill does the same job: it makes you hit the
friction a user hits before you start scanning pixels, so the ranking
reflects the task.

NN/g also recommends several independent evaluators because each one
misses things. You are one evaluator. Say so if the crit is high stakes,
and suggest a usability test for anything you rated Blocks that you're not
sure about.

The 10 heuristics (Nielsen, reviewed by NN/g in 2024) are a vocabulary for
naming why something is a problem:

1. Visibility of system status
2. Match between the system and the real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation

A heuristic broken on purpose isn't automatically a problem: NN/g's own
example is a hamburger menu on mobile, a trade-off that can be right. Ask
what the user gains from the break.

## 4. Severity

Nielsen's scale, which the skill's ranks map onto:

| Score | Nielsen's name | Skill rank |
|---|---|---|
| 0 | Not a usability problem | dropped |
| 1 | Cosmetic problem only | Polish |
| 2 | Minor usability problem | Snags |
| 3 | Major usability problem | Hurts |
| 4 | Usability catastrophe | Blocks |

The score comes from 3 things together: **frequency** (how often it comes
up), **impact** (how hard it is to get past) and **persistence** (once,
or every time). Nielsen adds market impact; for a design crit, read that as
whether it damages trust in the product. A rare problem that loses
someone's work can outrank a frequent one that costs a second.

Failing WCAG 2.2 AA is at least Hurts, and Blocks when it stops someone
completing the task (an unlabelled control a screen reader user can't
find, a form that can't be submitted from the keyboard).

## 5. Problem or taste

A finding is a problem when you can name what happens to the person and
trace it to the goal, a standard the product has adopted (obvious's rules,
platform conventions) or WCAG. Otherwise it's taste. Test: finish the
sentence "Because of this, the person..." If you can't, it's taste.

Taste notes are allowed and useful, from a designer. They go in their own
section, labelled, after the problems, so nobody spends time fixing a
preference before a real problem.

## 6. Phrasing a finding

- Specific: the screen, the element, the width, the state, the screenshot.
- Grounded: what the person experiences, then why. Spool asks critics to
  justify praise and concerns with specifics and warns against hollow
  compliments and "I like this, but..."
- Ranked: the most important point first.
- Balanced honestly: Spool reports seasoned critics aiming for about 2
  positives per negative. Use that as a check that you've looked for what
  works. If there isn't that much to praise, don't make it up.
- Questions where intent is unclear: "Was the second button meant to be
  equal to Save?" is better than assuming a mistake.
- Concrete next step in the system's terms: a token, a type role, a
  registry component.

## 7. What critique can't tell you

Spool separates critique (judging from a designer's experience) from
heuristic evaluation and usability testing (judging from the user's side),
and NN/g is plain that heuristic reviews can't replace user research. A
crit predicts problems; it doesn't measure them. So:

- Don't claim how many people will struggle, or how much faster something
  would be.
- Where a finding rests on a guess about the users, say so, and suggest
  the smallest test that would settle it.
