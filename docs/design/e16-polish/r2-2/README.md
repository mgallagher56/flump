# E16 R2-2 frames: design-system round 2

- `hero-1280-light-after.png`, `hero-1280-dark-js-off-after.png`, `hero-1280-forced-colours-after.png`: HeroFigure rendered headlessly in Chromium. In order: light; dark from the system with JavaScript off (D30); forced colours, where axe went from 3 findings to 0.
- Page frames: the visual baselines in `apps/e2e/visual/__screenshots__`, regenerated in CI on this branch (`visual-regression.yml`, update run). The "before" frames are the baselines on `main`.

What shows on the pages:

- KPI strips use one value size. On mortgage, "4.50%" and "60.0%" now match "£1,250".
- The bottom bar labels use the whole slot at 375.
- The hero disc is quieter in dark.
