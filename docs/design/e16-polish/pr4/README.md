# E16 PR 4 screenshots: dashboard and sandbox

Before: the CI visual baselines on `main` before this PR. After: the baselines regenerated in CI on this branch. Both are full page, 375 and 1280, light and dark, from the Playwright container. Files: `<dashboard|sandbox>-<width>-<theme>-<before|after>.jpg`.

What changed:

- Dashboard: h1 "Your money" with nothing above it. Net worth appears once, in the hero. The KPI strip has 3 cards, or a single prompt when they are unset. Setup and the monthly check-in are grouped rows. At most 4 section cards, each with one figure, one line and one link.
- Sandbox: the same layout. Exactly 2 notices and 2 "Sign up" buttons. Locked cards show a lock icon only.
- The 320 px horizontal overflow is fixed.
- Forced-colours contrast findings fell from 6 to 2 on each page.

Re-score (visual / simplicity):

| Page      | Before        | After     |
| --------- | ------------- | --------- |
| Dashboard | 6.5 (5.5) / 4 | 9 / 9.5   |
| Sandbox   | 6.5 / 4       | 9.5 / 9.5 |

The dashboard visual score is below 9.5 for three reasons:

- For a new user, the dashed KPI prompt is a heavy block for one line.
- At 375, "Choose what shows here" takes its own row above the hero.
- The seeded e2e homeowner has a mortgage but no property account, so the hero is negative. That is data, not layout.
