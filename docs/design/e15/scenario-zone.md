# Saved details vs scenarios: decision and spec (fable, 2026-11-13; adopted by coordinator)

## Decision

Use a hybrid of options A and D, on the same page and the same route.

- Each domain page gets a **"Your details"** zone, which holds saved facts only.
- Each domain page gets one shared **`ScenarioZone`**, headed "Model a change" (per page: "Model a change to your mortgage", "...your debts", "...your pension", "...your savings", "...your budget", "...your pay"), which holds every what-if tool.
- There are no new routes.
- Hard rule: headline figures never read scenario inputs, and scenario inputs never write to saved data. (Advice policy R5 forbids "applying" a computed outcome.)

## Audit (origin/main)

| Page                 | What is mixed                                                                                                                                               | Severity      | Files                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| Mortgage             | One `loanAmount`/`interestRate`/`remainingTerm` state feeds the summary, the tracker and all simulators. Tracker sliders change the summary without saving. | High          | `containers/mortgage/MortgageContainer.tsx` (62-65, 394-405); `features/mortgage/components/*`       |
| Debt                 | `extraPayment` defaults to an invented £50 and drives the KPI strip.                                                                                        | High          | `containers/debt/DebtContainer.tsx:76,270-283`; `DebtSummary`                                        |
| Pension              | The forecaster's "Sync to profile" writes what-ifs to saved data. Salary and contribution % can be edited in two places.                                    | High          | `components/pension/PensionForecasterCard.tsx:449-510`; `containers/pension/PensionContainer.tsx`    |
| Budget and dashboard | Runway what-ifs auto-save to localStorage and drive the Budget headline and the dashboard widget.                                                           | High          | `utils/runwayStorage.ts`; `RunwayCalculator`; `BudgetContainer`; `BudgetWidget`; `routes/_index.tsx` |
| Savings              | `?payRise=` from Take-home is silently added to the projection, and puts money in the URL.                                                                  | Medium        | `containers/savings/SavingsContainer.tsx:16-51,187`; `containers/takeHome/TakeHomeContainer.tsx:47`  |
| Take-home            | Prefilled salary has no saved-vs-scenario cue, and the button says "Apply to Savings Forecaster".                                                           | Low to medium | `components/forecast/UKTaxCalculator.tsx:787`                                                        |

## Copy (en-GB)

- **"Your details" zone:** the heading is "Your mortgage", "Your pension" and so on. The state line reads "Saved" with the last-updated date, followed by an Edit button.
- **Scenario zone:** the heading is "Model a change" (per page: "Model a change to your mortgage", "...your debts", "...your pension", "...your savings", "...your budget", "...your pay") and the badge reads "Illustration, not saved". Do not use em dashes.
- **Basis line:** for example "Starting from your figures: £X at Y%, Z years left".
- **Buttons:**
  - Reset: "Reset to saved figures".
  - Cross-tool buttons: "Model this in ..."; never "Apply".
- **Naming:** never call the scenario zone "sandbox", because that name belongs to the signed-out demo.

## Visual (semantic tokens only)

- "Your details" uses `surface.card` and `border.DEFAULT`.
- ScenarioZone:
  - Background and outline: `surface.sunken` with a dashed `border.strong` outline.
  - Badge and notice: a neutral `StatusBadge` (icon plus text), with `ProjectionNotice` inside the zone.
  - Accessibility: it is a `<section aria-labelledby>`. Outcomes are announced through `LiveRegion` with the prefix "Illustration:". Never rely on colour alone.
- `surface.hero` goes only on a saved figure, never on a scenario outcome. The mortgage "Interest saved" hero from #508 moves to a saved figure, such as the balance.

## State rules

- The `KpiStrip` and the details card read loader data only.
- Scenario state:
  - It is seeded from saved data, marks each edited input, and makes no network calls.
  - Unknown inputs start empty, with no invented defaults (debt extra payment starts at £0).
- Fact inputs (balance, rate, term, salary, contribution %) are edited only in "Your details".
- There is no "apply to my details". The zone footer has an "Update your details" link that opens the normal edit form with the SAVED values.

## Persistence

- Scenario inputs live in container memory: they survive tab switches and clear on reload. Do not store them in localStorage, the backend, or URLs containing money values.
- Runway: "which accounts count" stays a labelled saved preference. Severance, extra cuts and dropped lines are session-only scenario inputs. The dashboard and Budget headlines use the baseline only.
- Savings pay rise: pass it via router state, and show it as a removable scenario input.

## URL and navigation

- `/app/mortgage?tool=overpayment|rate-change|overpay-vs-save` selects a tool and scrolls to the zone. Values never go in the URL. Keep the `#forecast` redirect.
- Page order:
  1. PageHeader
  2. KpiStrip (saved figures)
  3. Your details
  4. ScenarioZone, with tool tabs inside
  5. Schedules, in a `CollapsibleDrawer`
- Dashboard widgets and the T-IA-10 Related strip deep-link with `?tool=`.
- `/tools` stays as "Free calculators".

## New shared pieces

- `packages/ui/src/patterns/ScenarioZone`, with the full five files. Props: `title`, `basis`, `isModified`, `onReset`, `tools`/`children`.
- `useScenarioState(saved)` in `apps/web`, returning `values`, `set`, `reset` and `isModified`.
- A per-page test: changing a scenario input leaves the KPI strip unchanged and fires no request.
- One line added to AGENTS.md section 3.
- Each page PR includes before and after frames at 375 and 1280 px, in light and dark.

## Rollout (four PRs; open PRs #597, #602 and #590 merge as they are)

1. **UI and rule** (E15 Phase 2 lane): ScenarioZone, the hook, stories, the AGENTS.md line and the copy guide.
2. **Borrowing** (simulators lane): split mortgage saved state from scenario state, and move the tracker and LTV out of the tabs; debt extra payment starts at £0, and the KPIs come from saved data.
3. **Savings, pension and take-home**: build the pension forecaster inside the zone and remove "Sync to profile"; the savings pay rise goes via router state; take-home copy changes.
4. **Budget and dashboard**: split runway persistence, and the BudgetWidget and `_index` use the baseline only.

## Defaults adopted, owner can override

- "Update your details" does NOT prefill scenario values, until a solicitor has reviewed R5.
- The mortgage "Interest saved" card loses `surface.hero`.
