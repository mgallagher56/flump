# E17: warmth and life

`options.html` is the options page the owner chose from on 15 November 2026. Open it in a browser; it has no build step. It is the reference for the E17 PRs. Where it and this file differ, this file wins, because it records what was approved and what was ruled afterwards.

## Approved combination

| Area                | Choice                                                   | Notes                                                                                              |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Accent colour       | **A, Damson**, with D's bolder use of the existing tints | Tokens below. No tint value changes.                                                               |
| "Finish setting up" | **2A**, ring and next step, with 2C's finish state       | "Not for me" on every step.                                                                        |
| Illustrations       | **3A**, the four "now" scenes and the style sheet        | Check-in, pension, debts, savings.                                                                 |
| Motion              | Demos **1, 3, 4, 5 and 7**                               | Saved figure cross-fade, check-in advance, setup progress, save confirmation, scene on first view. |
| Sections            | **5A**, headers and a result card, on every page         | See the two rulings below.                                                                         |

## Owner rulings made after the page

1. "Months of cover" is renamed **"Breathing room"**. The page's "If your income stopped" label is superseded. The wording is fixed:

   | Part           | Wording                                           |
   | -------------- | ------------------------------------------------- |
   | Label          | Breathing room                                    |
   | Description    | How long your savings would cover the essentials. |
   | Value          | About 1.5 months                                  |
   | Dashboard line | Breathing room: about 1.5 months                  |

   The info tip says what "savings" means here (the accounts you can draw on) and what "the essentials" covers (essential spending and minimum debt payments). That detail stays out of the description.

2. That result moves **out of** the "Model a change to your budget" zone into **its own section** on the Budget page. The zone keeps its inputs and its illustration.

The standing rules for all five areas are in `docs/ux/STYLE-GUIDE.md` (sections 2.6, 8.1, 8.2, 11.1, 12.4 to 12.6 and the dated entry in section 14), with behaviour in `docs/ux/UX-GUIDELINES.md` (O4, S10, M5, M7).

## Token names (PR 1, stable for the follow-on PRs)

Colour, in `semanticTokens.colors` (`@flump/tokens`), light / dark:

| Token           | Light     | Dark      | Role                                                           |
| --------------- | --------- | --------- | -------------------------------------------------------------- |
| `accent`        | `#7a3f66` | `#dba6c9` | Icons, shapes, lines; text on card, canvas and `accent.subtle` |
| `accent.subtle` | `#f1e4ee` | `#33242f` | Tinted card or section                                         |
| `accent.border` | `#d6b4cc` | `#6a4560` | Edge of an `accent.subtle` surface                             |
| `accent.onHero` | `#e3b5d1` | `#e3b5d1` | One sun shape on `surface.hero`                                |
| `chart.accent`  | `#7a3f66` | `#dba6c9` | One chart series, labelled and dashed                          |

Motion: `durations.draw` 600ms, `durations.scene` 900ms, `easings.settle` `cubic-bezier(0.16, 1, 0.3, 1)`.

The native theme (`@flump/tokens/native`) carries the same keys.

## Rules

The accent rules are C7 and C8 in `docs/ux/STYLE-GUIDE.md` section 2.6. In short: decoration and wayfinding only; never on a figure, button, link or notice; never to say that anything about a person's money is good or bad.

## What the page's later sections still need from an owner

- `chart.accentPurple` is close to `chart.accent`. PR 1 keeps both; removing the purple is a follow-up.
- `AGENTS.md` section 2 still names six namespaces. The proposed wording is in the PR description for the owner to apply.
