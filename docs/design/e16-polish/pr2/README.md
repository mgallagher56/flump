# E16 PR 2 screenshots

Before (`origin/main` ca6984fe) and after (this branch) of the affected Storybook stories, at 375px and 1280px, light and dark, captured with Playwright (Chromium) against static Storybook builds. Theme is set with `&globals=theme:light|dark`; stories that pin their own theme use their `Dark` variant for the dark shot. JPEG to keep each file under 200 KB. File names are `<component>-<375|1280>-<light|dark>-<before|after>.jpg`.

Story titles moved in this PR, so each pair compares the old and new story for the same component.

| Component                | Before story                          | After story                                                     | Files                        |
| ------------------------ | ------------------------------------- | --------------------------------------------------------------- | ---------------------------- |
| Tabs (was SegmentedTabs) | `2. Primitives/SegmentedTabs` Default | `2. Primitives/Tabs` Item counts (2, 3 and 4 items, plus small) | `segmentedtabs-*`            |
| ProjectionNotice         | `3. Financial Patterns/Sections`      | `3. Patterns/ProjectionNotice` Default                          | `projectionnotice-*`         |
| ScenarioZone             | `3. Financial Patterns/Sections`      | `3. Patterns/ScenarioZone` Default                              | `scenariozone-*`             |
| KpiCard                  | `2. Primitives/KpiCard` Default       | same title, Default                                             | `kpicard-*`                  |
| KpiStrip                 | `3. Financial Patterns/Sections`      | `3. Patterns/KpiStrip` Four columns                             | `kpistrip-*`                 |
| ChartFigure              | `3. Financial Patterns/Sections`      | `4. Charts/ChartFigure` Default                                 | `chartfigure-*`              |
| CollapsibleDrawer        | `2. Primitives/CollapsibleDrawer`     | same title, Default                                             | `collapsibledrawer-*`        |
| PageHeader               | `3. Financial Patterns/Sections`      | `3. Patterns/PageHeader` Default                                | `pageheader-*`               |
| Dashboard template       | `4. Page Templates/Templates`         | `6. Pages/Templates` Dashboard                                  | `dashboardtemplate-*`        |
| Simulator template       | `4. Page Templates/Templates`         | `6. Pages/Templates` Simulator                                  | `simulatortemplate-*`        |
| HeroFigure (new)         | none                                  | `3. Patterns/HeroFigure` Default                                | `herofigure-*-after` only    |
| IconTile (new)           | none                                  | `2. Primitives/IconTile` Domains                                | `icontile-*-after` only      |
| Page rules (new)         | none                                  | `1. Foundations/Page rules`                                     | `pagerules-*-after` only     |
| KpiCard, not set (new)   | none                                  | `2. Primitives/KpiCard` Not set                                 | `kpicardnotset-*-after` only |

What changed: the tab control is now a single `Tabs` primitive with a lighter track and a clearer selected pill; the four-item variant is wider than a 375px viewport and clips at the right edge, where it is meant to scroll. `ScenarioZone` loses its heavy dashed outline and tinted fill for a faint border on a near-canvas surface, moves the "Illustration, not saved" badge to the top right, puts the reset button beside the next-step link, and replaces the blue boxed advice notice with a quiet line under a divider (`ProjectionNotice` follows the same quieter treatment). `KpiCard` now has an explicit "Not set" state. The dashboard and simulator templates are built from the new pieces: a `HeroFigure` net worth block above a three-card strip, collapsible data under the chart, and the page body inside the app shell. At 375px the dashboard KPI strip wraps to two cards and one, and the accounts table scrolls sideways so the Balance column is off screen.

Not captured: stories in other groups that reuse these components (Debt, Pension and Budget pages), and the interactive states of Tabs.
