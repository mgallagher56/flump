# E43. User-POV functionality map

Decisions: accepted 2026-11-21 (FM1–FM5)

> Status: complete 2026-11-21 (S0–S4 complete; 100% route-coverage enforcement active). Paths are relative to the repository root.
>
> Superseded in part on 22 November 2026: the owner cut the map back to route level, because it is for AI agents only and hand-kept control labels go stale. Capabilities, actions, `entry_points`, section `name`, `kind` and `when`, and `actions-index.md` are removed. Sections keep `id`, `component`, `facts_read` and `figures_shown`. The current format is in `docs/system/functionality-map/README.md`; the layer 3 and 4 detail below is historical.

## 1. Decisions (for owner sign-off before S0/S1)

1. **FM1. Marketing dynamic feature pages (`FeaturePage`):** `apps/marketing/src/pages/FeaturePage` serves multiple `/features/:slug` routes. Should it be mapped as one template page (`feature-detail`) with a `when` / variant note per slug, or one YAML file per feature slug?
   - *Recommendation:* One template page (`marketing/feature-detail.yaml`) if all feature pages share the same sections and actions; split into separate files only if a feature page has unique interactive controls (for example `AiConnectionPage` already has its own page component).
2. **FM2. Route-coverage enforcement timing:** During S0–S3, unmapped routes in `apps/web/app/routes.ts` and `apps/marketing/src/App.tsx` are listed in `unmapped_allowlist` (or printed as warnings) so `bun run check:laws` stays green while slices land. Should S4 flip unmapped routes to a hard error in `check:laws`?
   - *Recommendation:* Yes. Once S4 lands, every new route must ship with its `pages/{web|marketing}/<page-id>.yaml` in the same PR.
3. **FM3. Non-UI and API routes:** Routes such as `api.$.tsx`, `account.export.ts`, and auth callback handlers have no user-facing UI sections. Should they live in an explicit `excluded_routes` list in `docs/system/functionality-map/index.yaml` (with a one-line `reason`) so `check-functionality-map.ts` still accounts for 100% of route files?
   - *Recommendation:* Yes. Every route file is either mapped in `pages/` or explicitly justified in `excluded_routes`.
4. **FM4. Action IDs in E2E tests and UX audits:** Should Playwright tests in `apps/e2e` and UX/interaction audits (such as E38) reference Layer 4 action IDs (for example `retirement.plan-details.save-plan`) in test descriptions or comments, without requiring `data-testid` renames on existing components?
   - *Recommendation:* Yes, as optional cross-references in test names and audit findings; no forced DOM attribute changes.
5. **FM5. Single script in `check:laws`:** Should `scripts/check-functionality-map.ts` verify generated-view freshness internally (mirroring `scripts/check-value-map.ts` and `staleViews`), rather than adding two separate commands to `package.json` `check:laws`?
   - *Recommendation:* Yes. Keep `check:laws` to one command (`bun scripts/check-functionality-map.ts`) plus `bun run functionality-map` (`bun scripts/generate-functionality-map.ts`) as the generator script.

## 2. Summary and why it matters

`docs/system/value-map.yaml` answers "where is this value stored, entered and used". It does not tell an agent or the owner what a user sees on a screen, what each region does, or every control a user can operate.

E43 adds a **user-POV functionality map** alongside `value-map.yaml`:

- **4-layer user-POV hierarchy:** drills down from **Page** -> **Section / Region** -> **Capability / Flow** -> **Action**.
- **Sharded by page:** one YAML file per page under `docs/system/functionality-map/pages/{web|marketing}/<page-id>.yaml`, so feature PRs do not collide on a single 3,000-line file and agents only read the page file they need.
- **Cross-referenced to `value-map.yaml`:** every capability's `facts_read`, `facts_written`, and `figures_shown` references real IDs in `docs/system/value-map.yaml`, verified by `check-functionality-map.ts`.
- **Generated read-only Markdown views:** `overview.md` (site-wide tree) and `actions-index.md` (searchable table of every action) built by `scripts/generate-functionality-map.ts`.

## 3. Format specification

### Directory layout

```text
docs/system/functionality-map/
  index.yaml                          # Hand-edited: version, excluded_routes, unmapped_allowlist (S0-S3)
  pages/
    web/
      retirement.yaml                 # Hand-edited: one file per web page
      ...
    marketing/
      security.yaml                   # Hand-edited: one file per marketing page
      ...
  generated/
    overview.md                       # Generated: site-wide Page -> Section -> Capability tree
    actions-index.md                  # Generated: flat searchable table of every Action
```

### `index.yaml` schema

```yaml
version: 1
# Routes with no user-POV UI (API proxies, file downloads, auth callbacks).
# Every entry must match a real route file and state a reason.
excluded_routes:
  - route_file: apps/web/app/routes/api.$.tsx
    reason: Backend API proxy route, no user-facing page.
  - route_file: apps/web/app/routes/account.export.ts
    reason: JSON data export download endpoint triggered from Settings.

# Temporary allow-list during S0-S3 rollout. Emptied and removed in S4.
unmapped_allowlist:
  - apps/web/app/routes/app._index.tsx
```

### 4-layer page YAML schema (`pages/{web|marketing}/<page-id>.yaml`)

#### Layer 1: Page

| Field | Required | Type / Values | Description |
| --- | --- | --- | --- |
| `id` | Yes | `string` (kebab-case) | Unique page ID matching filename (`retirement`, `security`). |
| `app` | Yes | `"web" \| "marketing"` | Owning application. |
| `route` | Yes | `string` | URL path pattern (for example `/app/retirement`, `/security`). |
| `title` | Yes | `string` | Page title or `<title>` / `PageHeader` heading. |
| `auth` | Yes | `"required" \| "public" \| "anonymous-only" \| "admin"` | Access requirement from the user's POV. |
| `purpose` | Yes | `string` | Plain one-sentence summary of what the user comes here to do. |
| `entry_points` | Yes | `string[]` | Where users arrive from (nav item, link from another page, direct URL). |
| `route_file` | Yes | `string` | Repo-relative path to the route or page file (verified to exist). |
| `sections` | Yes | `Section[]` | Ordered list of Layer 2 sections on the page. |

#### Layer 2: Section / Region

| Field | Required | Type / Values | Description |
| --- | --- | --- | --- |
| `id` | Yes | `string` (kebab-case) | Unique within the page (full ID `<page>.<section>`). |
| `name` | Yes | `string` | User-facing heading or region name. |
| `kind` | Yes | `"header" \| "hero" \| "kpi-strip" \| "scenario-zone" \| "form" \| "list" \| "table" \| "drawer" \| "notice" \| "navigation" \| "content" \| "footer"` | Structural role on the page. |
| `component` | Yes | `string` | Repo-relative path to the primary component file or directory (verified to exist). |
| `when` | No | `string` | Condition for visibility (for example `"when savedResult exists"`, `"when targetMode is budget"`). Omit if always shown. |
| `capabilities` | Yes | `Capability[]` | Ordered list of Layer 3 capabilities in this section. |

#### Layer 3: Capability / Flow

| Field | Required | Type / Values | Description |
| --- | --- | --- | --- |
| `id` | Yes | `string` (kebab-case) | Unique within the section (full ID `<page>.<section>.<capability>`). |
| `goal` | Yes | `string` | What the user accomplishes in this capability. |
| `mode` | Yes | `"read" \| "what-if" \| "write" \| "navigate" \| "export" \| "delete"` | Whether it reads saved data, runs local scenarios, mutates saved state, navigates, exports, or deletes. |
| `facts_read` | No | `string[]` | Fact IDs from `docs/system/value-map.yaml` (validated). Defaults to `[]`. |
| `facts_written` | No | `string[]` | Fact IDs from `docs/system/value-map.yaml` written by this capability (validated). Defaults to `[]`. |
| `figures_shown` | No | `string[]` | Figure IDs from `docs/system/value-map.yaml` displayed here (validated). Defaults to `[]`. |
| `actions` | Yes | `Action[]` | Ordered list of Layer 4 actions (may be `[]` for read-only display capabilities). |

#### Layer 4: Action

| Field | Required | Type / Values | Description |
| --- | --- | --- | --- |
| `id` | Yes | `string` (kebab-case) | Unique within the capability (full ID `<page>.<section>.<capability>.<action>`). |
| `control` | Yes | `"button" \| "submit" \| "link" \| "input" \| "slider" \| "toggle" \| "checkbox" \| "select" \| "tab" \| "sort-header" \| "drawer-toggle"` | UI control kind. |
| `label` | Yes | `string` | Exact visible label, `aria-label`, or heading shown to the user. |
| `effect` | Yes | `string` | Observable outcome from the user's POV. |
| `target` | No | `string` | Route path, external URL, or backend endpoint (`PUT /retirement-plan`) when applicable. |
| `validation` | No | `string` | Client or server validation rule shown to the user. |
| `confirm` | No | `string` | Confirmation dialog or guard before executing (for destructive actions). |
| `if_match` | No | `boolean` | `true` when the mutation sends an optimistic-concurrency `If-Match` / `VERSION_FIELD` check. |

## 4. Concrete worked example: `/app/retirement`

Derived directly from `apps/web/app/routes/app.retirement.tsx` and `apps/web/app/features/retirement/components/RetirementPlanner/RetirementPlanner.tsx`:

```yaml
id: retirement
app: web
route: /app/retirement
title: Retirement plan
auth: required
purpose: See an estimate of yearly retirement income from saved pots and State Pension, test what-if changes, and save retirement plan details.
entry_points:
  - Main app navigation (Retirement)
  - Dashboard retirement widget link
route_file: apps/web/app/routes/app.retirement.tsx

sections:
  - id: header
    name: Page header
    kind: header
    component: apps/web/app/features/retirement/components/RetirementPlanner/RetirementPlanner.tsx
    capabilities:
      - id: orient
        goal: Identify the page and its pricing basis ("Estimates in today's prices, before tax.").
        mode: read
        actions: []

  - id: hero
    name: Headline retirement income estimate
    kind: hero
    component: apps/web/app/features/retirement/components/RetirementPlanner/RetirementPlanner.tsx
    capabilities:
      - id: view-headline-income
        goal: View the middle-case estimated yearly retirement income built from saved details, or follow a prompt to add missing details.
        mode: read
        facts_read:
          - retirement-plan
          - account-balance
          - salary
          - pension-rates
          - birth-year
          - housing-cost
          - housing-status
          - budget-entries
          - mortgage-term-and-fix-end
        figures_shown:
          - retirement-income
        actions:
          - id: complete-missing-details
            control: link
            label: Add missing plan or profile details
            effect: Navigates to the profile age-and-pay section or jumps to #retirement-plan-details when required inputs are missing.
            target: /app/profile#settings-age-and-pay

  - id: kpis
    name: Saved retirement summary strip
    kind: kpi-strip
    component: apps/web/app/features/retirement/components/RetirementPlanner/RetirementPlanner.tsx
    when: when savedResult exists
    capabilities:
      - id: view-saved-kpis
        goal: View saved pots counted towards retirement, State Pension estimate, and planned retirement age range.
        mode: read
        facts_read: [retirement-plan, account-balance]
        figures_shown: [retirement-income]
        actions: []

  - id: what-if-zone
    name: What-if scenario zone
    kind: scenario-zone
    component: apps/web/app/features/retirement/components/RetirementPlanner/RetirementPlanner.tsx
    when: when savedResult exists
    capabilities:
      - id: toggle-scenario-zone
        goal: Expand or collapse the what-if controls, or reset modified scenario values back to saved plan defaults.
        mode: what-if
        actions:
          - id: show-what-if
            control: drawer-toggle
            label: "Show what-if: change your plan"
            effect: Expands or collapses the ScenarioZone without changing saved data.
          - id: reset-what-if
            control: button
            label: Reset
            effect: Restores all scenario sliders and toggles to the saved plan values.

      - id: adjust-scenario-assumptions
        goal: Test different retirement ages, plan-to ages, contribution levels, and growth cases locally.
        mode: what-if
        facts_read: [retirement-plan, salary, pension-rates, account-balance]
        figures_shown: [retirement-income]
        actions:
          - id: set-retirement-age
            control: slider
            label: Retirement age
            effect: Updates scenario retirement age between currentAge and max(80, savedRetirementAge) and recalculates the illustration.
          - id: set-plan-to-age
            control: slider
            label: Plan to age
            effect: Updates scenario plan-to age between retirementAge + 1 and max(105, savedPlanToAge).
          - id: set-employee-contribution
            control: slider
            label: Your contribution
            effect: Updates employee pension percentage (0% to max(MAX_CONTRIBUTION_PERCENT, savedEmployeePercent), step 0.5%) when a workplace pension exists.
          - id: toggle-qualifying-earnings
            control: checkbox
            label: Base contributions on pay that counts for your pension
            effect: Switches workplace contribution calculation between whole salary and qualifying earnings band.
          - id: set-extra-monthly
            control: slider
            label: Extra monthly contribution
            effect: Updates extra monthly contribution (£0 to £2,000, step £50) when no workplace pension is present.
          - id: select-growth-case
            control: button
            label: Lower case / Middle case / Higher case
            effect: Switches the active growth case shown in the result block, pot chart, and year-by-year schedule.

      - id: inspect-assumptions-and-schedule
        goal: Inspect the pot accumulation chart, latest counted monthly check-in total, three growth cases, and year-by-year drawdown schedule.
        mode: read
        facts_read: [balance-history, retirement-plan, pension-rates]
        figures_shown: [retirement-income]
        actions:
          - id: toggle-assumptions-drawer
            control: drawer-toggle
            label: Assumptions, pots and year by year
            effect: Opens or closes the CollapsibleDrawer containing growth/inflation assumptions, State Pension summary, CaseTable, and YearScheduleTable.
          - id: open-pension-details
            control: link
            label: Add your rates on the Pension page / Change them on the Pension page
            effect: Navigates to the Pension page to edit workplace pension rates.
            target: /app/pension#pension-details
          - id: sort-case-table
            control: sort-header
            label: Yearly income / Pots at retirement
            effect: Sorts the 3-row growth case comparison table.
          - id: sort-year-schedule
            control: sort-header
            label: Age / From pots / State Pension / Housing / After housing
            effect: Sorts the year-by-year drawdown schedule table.

  - id: plan-details
    name: Your plan details
    kind: form
    component: apps/web/app/features/retirement/components/RetirementPlanner/RetirementPlanner.tsx
    capabilities:
      - id: edit-and-save-plan
        goal: Edit and save retirement age, plan-to age, yearly target (typed or from budget lines), State Pension inputs, growth/inflation assumptions, and excluded accounts.
        mode: write
        facts_read: [retirement-plan, budget-entries, account-balance]
        facts_written: [retirement-plan]
        actions:
          - id: input-retirement-age
            control: input
            label: Retirement age
            effect: Updates draft saved retirement age.
            validation: Whole integer age.
          - id: input-plan-to-age
            control: input
            label: Plan to age
            effect: Updates draft saved plan-to age.
            validation: Whole integer age greater than retirement age.
          - id: switch-target-mode
            control: button
            label: Typed figure / From budget lines
            effect: Switches yearly retirement target between a single typed GBP amount and per-line budget continuation toggles.
          - id: input-typed-target
            control: input
            label: Yearly target in pounds
            effect: Updates typed yearly spending target when targetMode is typed.
            validation: Non-negative finite number.
          - id: toggle-budget-line-status
            control: button
            label: Continues / Stops
            effect: Marks each non-housing budget line as continuing or stopping in retirement when targetMode is budget.
          - id: input-state-pension-age
            control: input
            label: State Pension age
            effect: Updates draft State Pension age.
          - id: check-govuk-spa
            control: link
            label: Check your State Pension age on GOV.UK
            effect: Opens GOV.UK State Pension age checker in a new tab.
            target: https://www.gov.uk/state-pension-age
          - id: input-state-pension-forecast
            control: input
            label: State Pension forecast (pounds a year)
            effect: Updates draft annual State Pension forecast in GBP.
          - id: input-qualifying-years
            control: input
            label: Or National Insurance qualifying years
            effect: Updates draft NI qualifying years used when no forecast is entered.
          - id: input-growth-and-inflation
            control: input
            label: Lower case growth (% a year) / Middle case growth (% a year) / Higher case growth (% a year) / Inflation (% a year)
            effect: Updates the three growth band rates and inflation assumption.
          - id: toggle-excluded-accounts-drawer
            control: drawer-toggle
            label: Accounts that count towards retirement
            effect: Expands or collapses the list of pensions, investments, and savings accounts.
          - id: toggle-account-included
            control: checkbox
            label: Account name checkbox
            effect: Includes or excludes an individual account from retirement projections.
          - id: save-plan
            control: submit
            label: Save plan
            effect: Submits payload to PUT /retirement-plan and remounts with updated ETag on success.
            target: PUT /retirement-plan
            if_match: true
```

## 5. Tooling, guards and maintenance rules

### `scripts/generate-functionality-map.ts`

- Reads `docs/system/functionality-map/index.yaml` and all `pages/{web|marketing}/*.yaml` files.
- Validates structure with Zod, then generates two deterministic, Biome-formatted Markdown files:
  - `docs/system/functionality-map/generated/overview.md`: grouped by app (`web`, `marketing`), listing each page (`id`, `route`, `auth`, `purpose`), its sections, and its capabilities with `mode` and `value-map` references.
  - `docs/system/functionality-map/generated/actions-index.md`: flat table of every action (`Full ID`, `Page`, `Section`, `Control`, `Label`, `Effect`, `Target / If-Match`).
- Supports `--check` mode: compares generated output in memory against disk and exits non-zero if stale.
- Wired into root `package.json` as `"functionality-map": "bun scripts/generate-functionality-map.ts"`.

### `scripts/check-functionality-map.ts`

Wired into `package.json` `"check:laws"` alongside `check-value-map.ts`. Checks:

1. **Schema validation:** `index.yaml` and every `pages/{web|marketing}/*.yaml` pass Zod validation (`app` matches folder, required fields non-empty, valid enum values).
2. **Unique IDs:** no duplicate page IDs across an app, no duplicate section IDs within a page, no duplicate capability IDs within a section, no duplicate action IDs within a capability.
3. **Path existence:** every `route_file` and `component` path exists in the repository.
4. **Value-map cross-references:** every ID in `facts_read` and `facts_written` exists in `docs/system/value-map.yaml` `facts`; every ID in `figures_shown` exists in `docs/system/value-map.yaml` `figures`.
5. **Generated-view freshness:** `overview.md` and `actions-index.md` match `generate-functionality-map.ts` output (`stale-views`).
6. **Route coverage:** parses `apps/web/app/routes.ts` (and `apps/web/app/routes/`) plus `apps/marketing/src/App.tsx` (and `apps/marketing/src/pages/`). Every route file must appear in a page YAML `route_file`, in `excluded_routes`, or (during S0–S3 only) in `unmapped_allowlist`.
   - S0–S3: unmapped routes not in `unmapped_allowlist` warn; dead entries in `unmapped_allowlist` fail.
   - S4: `unmapped_allowlist` is removed and any unmapped route fails `check:laws`.

### Proposed `AGENTS.md` maintenance rule (parallel to section 16)

Add a subsection under `AGENTS.md` (next to section 16's value-map rule):

- **Update the functionality map in the same PR.** Any PR that adds, removes, or changes a route, page section, capability, or user control (button, link, input, slider, toggle, drawer) updates the corresponding `docs/system/functionality-map/pages/{web|marketing}/<page-id>.yaml` (or `excluded_routes` in `index.yaml` for non-UI routes) and runs `bun scripts/generate-functionality-map.ts`.
- **Guard.** `bun scripts/check-functionality-map.ts` (part of `check:laws`) fails on invalid schema, duplicate IDs, dead file paths, unknown `value-map.yaml` fact/figure IDs, stale generated views, or unmapped routes.

## 6. Slice plan (S0–S4)

| Slice | Scope | Deliverables | Exit criteria |
| --- | --- | --- | --- |
| **S0** | Tooling, guard & pilots | Zod schema, `scripts/generate-functionality-map.ts`, `scripts/check-functionality-map.ts` wired into `check:laws`, `index.yaml` with `excluded_routes` and `unmapped_allowlist`, `AGENTS.md` rule, plus pilot pages `web/retirement.yaml` and `marketing/security.yaml`. | `bun run check:laws`, `bun run lint`, `bun run check-types`, and unit tests for the check/generator scripts pass. |
| **S1** | Core web app pages | Map Dashboard (`/`), Onboarding (`/app/onboarding`), Accounts (`/app/accounts`), Account detail (`/app/accounts/:account`), History (`/app/accounts/history`), Budget (`/app/budget`), and Monthly check-in flow. | All 7 pages mapped, `unmapped_allowlist` shrunk, views regenerated, `check:laws` green. |
| **S2** | Calculators & planners | Map Savings (`/app/savings`), Debt (`/app/debt`), Mortgage (`/app/mortgage`), Mortgage Estimates (`/app/mortgage-estimates`), Pension (`/app/pension`), Tax (`/app/tax`), Self Assessment (`/app/self-assessment` and `/:source`), Take-home (`/app/take-home`), Forecast (`/app/forecast`), Invoicing (`/app/invoicing`). | All planner/calculator pages mapped with `value-map.yaml` cross-refs verified, views regenerated, `check:laws` green. |
| **S3** | Settings, auth, invites & states | Map Settings (`/app/profile`), Household, Imports (`/app/imports`), Auth (`/login`, `/logout`, callback), Invites / Not-invited / Admin, Sandbox (`/app/sandbox`), and web error / not-found routes. | Every `apps/web` route either mapped or in `excluded_routes`; `unmapped_allowlist` contains only `apps/marketing` pages. |
| **S4** | Marketing pages & hard enforcement | Map `apps/marketing/src/pages/*` (`HomePage`, `FeaturesIndexPage`, `FeaturePage`, `AiConnectionPage`, `PricingPage`, `ContactPage`, `PreviewPage`, `NotFoundPage`), remove `unmapped_allowlist`, and enforce 100% route coverage as a hard error in `check-functionality-map.ts`. | `unmapped_allowlist` removed, `check:laws` fails on any unmapped route across both apps, full CI green. |
