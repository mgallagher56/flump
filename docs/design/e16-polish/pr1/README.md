# E16 PR 1 screenshots

Before (`origin/main` fe77f687) and after (this PR) at 1280px, light and dark, captured with Playwright (Chromium) against local dev servers. JPEG to keep each file under 200 KB.

| Page           | Route                                    | Files                                           |
| -------------- | ---------------------------------------- | ----------------------------------------------- |
| Dashboard      | `/sandbox` (signed-out "Renting" sample) | `dashboard-1280-{light,dark}-{fold,full}-*.jpg` |
| Marketing home | marketing `/`                            | `marketing-home-1280-{light,dark}-fold-*.jpg`   |
| KPI card edge  | dashboard, light, 640 x 160 crop         | `kpi-card-edge-light-zoom-*.jpg`                |

What changed: in light mode, `Card`, `KpiCard`, `Table` and `CollapsibleDrawer` have a visible warm edge (`border`, 1.31:1 on the canvas) and a stronger two-layer shadow, so cards lift off the sand. Dark mode only gains the slightly firmer hairline. Marketing home has no visible change (it uses none of those primitives above the fold). Nothing else moves: the new tints, `numeric.hero`/`numeric.unset` and page-template tokens have no consumers until PR 2.

Not captured: the signed-in budget page. It needs the backend and an onboarded user, and no local stack was available to this session. Budget uses the same `KpiCard` and `Card` primitives, so it gets the same edge and lift; the audit's budget shots are in `../before/mortgage/budget-1280-*.png` (not committed). The marketing full-page shots were over 200 KB and are not committed.
