# Phone audit: findings (November 2026)

Status: audit, phase 1 (no product code changed). Decisions: none needed (see the end).

What was run: the journeys in `JOURNEYS.md`, driven by `apps/e2e/sweep/phone.spec.ts` against a
local build of `main` at `c2e14680b` (19 November 2026, after PRs 777, 779 and 781 merged; earlier passes on `974072a9b` and `f5631d4f0` were re-checked row by row against it; the debt, self-employed, retirement and settings sets last ran on `f5631d4f0`, and nothing PR 781 changed is specific to them), at 320x568, 375x812, 390x844 and
430x932 in light and dark with Chromium touch and mobile emulation, plus 812x375 landscape on the
main pages. Every page records measured checks (`apps/e2e/sweep/phoneChecks.ts`); every overlay
records its edge, height, close control, focus, scroll lock and scroll after closing; persona
sets also record scroll after bottom-bar navigation and Back, axe at 375 in both themes and a
200% text pass. The screenshots were then reviewed by eye. Screenshots and JSON are outside the
repository (the path is in the coordinator report).

Counts: 80 findings. None blocks a task, 42 get in the way and 38 are cosmetic.

Severity: **blocks** a task, **gets in the way**, or **cosmetic**. "Owner's eye" marks a
judgement rather than a written rule. Rules cite `docs/ux/UX-GUIDELINES.md` (H, N, F, D, C, E, T,
A, R, M ids), `docs/ux/STYLE-GUIDE.md` (SG section) and WCAG 2.2.

## What passed

Measured at every width and theme unless stated, so these need no fix:

- No horizontal scrolling on any page at 320 to 430 wide, portrait or landscape (A6, R1), except
  Self Assessment at 320 (P48) and its record dialog (P79).
- The h1 and headline figure are in the first view on every page at every width (H3).
- No layout shift after load, except Take-home and Mortgage (P61).
- Axe (WCAG 2.0, 2.1, 2.2 A and AA) is clean at 375 in light and dark on every persona page.
- No content ends under the bottom bar; `AppShell` pads for it and the safe-area bottom inset.
- At most one illustration in view on every page.
- No hover-only rules (every `:hover` rule that reveals something is inside a hover media query
  or has a focus twin).
- Money and percentage fields use `CurrencyInput` and `PercentInput` with a decimal keypad; no
  email fields in the web app (sign-in is hosted).
- Buttons, InfoTips, account rows and dashboard card links meet 44px on touch (Button's coarse
  `minH: touch`, InfoTip's coarse box, and stretched `::after` hit areas on rows and cards).
- Bottom-bar navigation leaves the next page at the top (scroll 0 after every one of 135
  navigations). Back restores the place on every page but Mortgage (P13, P80).

## The owner's five named problems

PR 781 (phone-nav-fixes) merged before the final run. Status on `c2e14680b`:

| Id  | Problem | Status | What the sweep saw |
| --- | ------- | ------ | ------------------ |
| O-1 | Pages open scrolled down after navigation | Fixed in Chromium | Scroll 0 after all 135 bottom-bar navigations at every width. But Back read as landing at the top on 22 of 135 tries (P80), which phase 2 traced to the sweep's timing; only Mortgage (P13) was real |
| O-2 | Web footer too tall | Fixed | One line, logo and links, about 70px at every width |
| O-3 | Screen jumps when the keyboard opens on successive inputs (onboarding, add account) | Cannot be confirmed here | No real phone keyboard and no iOS Simulator on this machine. The field walk in every sheet and onboarding step found focus scrolling only, no jumps caused by scripts. PR 781's visual-viewport inset is covered by its own emulated test, not by a real keyboard |
| O-4 | Menu button on the left, drawer opens on the right | Fixed | Menu button now at x=337 on the right, drawer attached right, at every width; the marketing menu matches |
| O-5 | "More" in the bottom bar spaced differently | Fixed | All five bar items share equal slots (62, 73, 76 and 84px at 320, 375, 390 and 430) |

## Shared root causes (fix once)

| Root  | Component                                                                    | Findings it fixes                      |
| ----- | ---------------------------------------------------------------------------- | -------------------------------------- |
| RC-1  | `PageHeader` below `md` (`packages/ui/src/patterns/PageHeader/PageHeader.styles.ts:11-12`), its actions and its new illustration slot | P01, P02, P03, P04, P49, P50, P51, P53 |
| RC-2  | `Tabs` trigger heights and the scrolling tab row (`packages/ui/src/primitives/Tabs/Tabs.styles.ts`) | P05, P06, P07                 |
| RC-3  | `SliderField` value pill at 14px (`packages/ui/src/primitives/SliderField/SliderField.styles.ts:41,62-70`) | P08                       |
| RC-4  | Overlay focus return without `preventScroll` (`packages/ui/src/primitives/Dialog/useDialogFocusReturn.ts:64,69`) | P12                       |
| RC-5  | `WidgetVisibilityPanel` built on raw Radix, not the `@repo/ui` Dialog or Sheet | P10                                   |
| RC-6  | Safe-area insets handled for the bottom edge only                            | P15                                    |
| RC-7  | Button `variant="link"` drops the touch minimum (`packages/ui/src/primitives/Button/Button.styles.ts:83-85,101-106`) | P16         |
| RC-8  | Route error boundary renders the signed-out shell                            | P17, P18                               |
| RC-9  | `KpiStrip` and `KpiCard` on a phone                                          | P20, P21, P22                          |
| RC-11 | A section or card header with an action beside its text (`SectionHeader` with action, the collapsed scenario entry card) | P24, P25, P62, P63 |
| RC-12 | Three different sheet footers (stacked, side by side, a lone Save)            | P28, P64                               |
| RC-10 | Fixed chrome sized in rem at large text                                      | P19                                    |

## Findings

| Id  | Journey, step | Page or component (file) | Widths, themes | What is wrong | Rule | Severity | Likely cause | Proposed fix |
| --- | ------------- | ------------------------ | -------------- | ------------- | ---- | -------- | ------------ | ------------ |
| P01 | J5 1, J9 1 | Self Assessment header, `apps/web/app/containers/tax/TaxContainer.tsx` with RC-1 | 320, 375; both | The tax-year picker sits on top of the "Self Assessment" title and the first line of its description, with or without records | A6, owner's eye | gets in the way | RC-1: the grid's `minmax(min-content, 1fr) auto` lets the action overlap a long h1 | RC-1: below `md` use a wrapping flex row; the action drops under the h1 when it does not fit |
| P02 | J2 9, J3, J4, J5, J6 (200% text) | `PageHeader`, Accounts, Budget, Pension | 375 light | At 200% text the description and action row stick out past the screen and the page scrolls sideways | A6, WCAG 1.4.4, 1.4.10 | gets in the way | RC-1: `md` is em-based so never applies; min-content of h1 plus a nowrap aside exceeds the width | RC-1 as P01; column `minmax(0, 1fr)` at least |
| P03 | J2, J7 | `PageHeader` on Budget, Debt, History, Accounts | 320, 375; both | The h1 wraps to two or three lines beside the action ("Net worth history" takes three) | owner's eye | cosmetic | RC-1 by design (comment at `PageHeader.styles.ts:4-6`) | RC-1: let the action drop under the h1 instead of squeezing it |
| P04 | J2 to J6 | Page "Add" actions (`SavingsContainer.tsx`, `PensionContainer.tsx` against Accounts, Debt) | all | Some "Add" header buttons have a "+" icon and some do not | SG 12, owner's eye | cosmetic | Each page passes its own button | One rule in `PageHeader` actions: icon or none, everywhere |
| P05 | J2 to J6 | `Tabs` triggers on Debt, Mortgage, Savings, Take-home, Pension, Settings | all | Tab triggers are 32 to 38px tall on touch | A5, WCAG 2.5.5 | gets in the way | RC-2: `tabTrigger` sizes `sm` 32px and `md` 36px have no coarse rule | RC-2: `"@media (pointer: coarse)": { minHeight: "touch" }` on `tabTrigger`, or a 44px `::before` hit area |
| P06 | J3 2, J4 1, J5 4 | Scenario tab rows on Debt ("Highest rate first") and Mortgage ("Overpay or save") | 320, 375; both | The tab row scrolls sideways: a label is always cut and the first tab clips at the left when the last is chosen | R8, A6, owner's eye | gets in the way | RC-2: one non-wrapping row inside a fade | RC-2: below 400px let the row wrap to a 2x2 grid of equal cells (N5 allows 4 tabs), or shorter labels |
| P07 | J8 1 (200% text) | Settings tabs | 375 light | At 200% text "Data" is off screen and reachable only by sideways scrolling | A6 | gets in the way | RC-2 | RC-2 as P06 |
| P08 | J2 4, J3, J4, J5 | `SliderField` value pill on Debt, Mortgage, Savings, Pension, Take-home | all | The editable value input is 14px, so iOS Safari zooms the page when it is tapped | R7, F5, owner's eye | gets in the way | RC-3: `sliderPillInput` inherits `label.md` (0.875rem) | RC-3: `fontSize: "md"` (16px) on the input |
| P09 | J8 2, J11 | `ConfirmDialog` typed confirmation (Delete all data, Delete account), `packages/ui/src/patterns/ConfirmDialog/ConfirmDialog.tsx:129` | all | The "type to confirm" input is 14px, so iOS zooms on tap; at 320 the dialog opens scrolled to its foot with the title off screen | R7, D1 | gets in the way | The native input uses a small text style; focus moves to the input at the foot | 16px input text; open with the title in view (focus the title or keep the input above the buttons) |
| P10 | J2 1 | Choose what shows here, `apps/web/app/features/dashboard/components/WidgetVisibilityPanel/WidgetVisibilityPanel.tsx:76-139` | all | On a phone it is a centred box with no close button, its list runs behind the bottom bar, and closing it drops focus to the page body | R4, A3, WCAG 2.4.3 | gets in the way | RC-5: raw Radix, opened by a plain button with no `Dialog.Trigger`, so focus has nowhere to return | RC-5: rebuild on the `@repo/ui` Sheet (bottom sheet, close button, `useDialogFocusReturn`) |
| P11 | J2 2, J10, J11 | Nav drawer, `packages/ui/src/patterns/NavDrawer/NavDrawer.tsx` | all | Still on `c2e14680b`: the page behind the open drawer (web and marketing) is not scroll-locked (no overflow lock on body or html) | R4, owner's eye | gets in the way | The drawer does not use the Dialog primitive's scroll lock | Lock body scroll while open (the Dialog primitive's remove-scroll), as the sheets do |
| P12 | J2 2, J7 1 | Dialog, Sheet and ConfirmDialog close, `useDialogFocusReturn.ts:64,69`; also `NavDrawer.tsx:66`, `AvatarMenu.tsx:30` | all | Closing a dialog opened from a header action returns focus with a plain `focus()`, which scrolls the page to the opener (measured 240px to 0) | owner's eye (same class as O-1) | gets in the way | RC-4: `focus()` without `preventScroll` | RC-4: `focus({ preventScroll: true })`, then `scrollIntoView({ block: "nearest" })` only if the opener is off screen. Confirm on a device: the sweep's own tap scrolls the opener into view first |
| P13 | J3 6 | Mortgage, `apps/web/app/containers/mortgage/MortgageContainer.tsx` | 320 to 430; light | Back to Mortgage after scrolling it lands at the wrong place (1,799px became 236px at 375; 1,877 became 2,561 at 320) | owner's eye (same class as O-1) | gets in the way | The page height changes after the restore (charts and scenario zone sized after hydration) | Still present after PR 781; fix with P80: restore after the charts have their size, or give chart regions a fixed min-height |
| P14 | J2 2 | Nav drawer "Sign out", `apps/web/app/components/structure/header/MobileNavDrawer/MobileNavDrawer.tsx:117-119` | all | "Sign out" has no icon, a different weight and indent from the items above it, and the gap above the footer group differs a lot between 320 and 375 | owner's eye (one item spaced differently) | cosmetic | The footer renders `UserLogin` (a centred ghost Button) instead of a row like its siblings | Render the sign-out form with the row style `footerLinkClass(false)` and a log-out icon |
| P15 | J10 | `TopBar`, `NavDrawer`, `MobileBottomBar`, right `Sheet`, `Toast` | landscape on notched phones | Only the bottom safe-area inset is padded; with `viewport-fit=cover` (`apps/web/app/root.tsx:226`) the header, drawer, bottom bar and toasts can sit under the notch at the sides in landscape | R5 | gets in the way (device to confirm) | RC-6: no `safe-area-inset-left/right/top` anywhere | RC-6: pad TopBar top and sides, NavDrawer top and side, bottom bars and toasts left and right |
| P16 | J2 2, J7 2 | "See how it has changed" (`AccountsGroupList.tsx:304`), "Add earlier months" (`SnapshotHistoryPage.tsx:298-308`) | all | These link-style buttons are about 20px tall on touch | A5, WCAG 2.5.8 | gets in the way | RC-7: the `link` variant forces `minH: 0, py: 0` | RC-7: a coarse-pointer `::before` hit area of 44px on the `link` variant, as `CollapsibleDrawer` does |
| P17 | J2 8 | Error state, `apps/web/app/features/feedback/components/RouteErrorState/RouteErrorState.tsx`, `apps/web/app/root.tsx:263` | all | When a page's data fails to load, a signed-in user sees a header with "Sign in" and no bottom bar | N6, E6 | gets in the way | RC-8: the root error boundary renders without the loader's user | RC-8: keep the signed-in shell (read the session in the boundary or render the boundary inside the app layout) |
| P18 | J8 3 | Missing account (`/app/accounts/does-not-exist`), not-found page header | all | A missing account shows "a problem on our side" with "Try again" instead of not-found with a way back to Accounts | E6, N6 | gets in the way | The loader passes a 400 from the backend through | Map 400 and 404 for an account id to the not-found state with "Back to accounts" |
| P19 | J2 9 (200% text) | `AppBottomBar`, `MobileBottomBar`, `TopBar` | 375 light | At 200% text the header and bottom bar take 228 of 812px (28%) and the bar labels truncate to "Acc…" and "Bud…" | A6, owner's eye (oversized chrome) | gets in the way | RC-10: bar and header heights scale with text | RC-10: let the bar labels wrap or switch to two lines, cap the bar height, compact the header at large text |
| P20 | J3 2, J5 4 | Mortgage `KpiStrip` | 320 to 430 | Three KPI cards stack as full-width cards, a whole screen tall | R3 | gets in the way | RC-9: three cards fall back to one column | RC-9: two columns with the third full width, or a list (R3) |
| P21 | J2 to J6 | `KpiCard` pairs on Home, Debt, Budget | 320, 375 | When one card's label wraps, the two figures sit at different heights | owner's eye (siblings uneven) | cosmetic | RC-9: no shared label height in a row | RC-9: align the figure row across a strip (grid rows or `align-items: end` on the value) |
| P22 | J2 4, J2 5 | Pension and Take-home `KpiStrip` | 320, 375 | A single full-width KPI card with a much larger figure than the two-up cards on other pages | owner's eye | cosmetic | RC-9 | RC-9: one size of KPI figure on a phone |
| P23 | J2 3, J4 4 | Budget hero, `apps/web/app/containers/budget/BudgetContainer.tsx` | all | The headline says "£125 left over" while its own sub-line gives a different figure (£262; £320 against £0 for the debt payer) | H11, owner's eye | gets in the way | The caption describes a different quantity in one sentence | Name the second figure for what it is, or move it out of the hero (wording is this lane's to set in phase 2) |
| P24 | J2 3, J4 4 | Budget "Model a change to your budget" card | 320, 375 | The card's text is squeezed into a narrow column beside its button, about seven lines | owner's eye | cosmetic | Text and button share one row at every width | Stack the button under the text below `sm` |
| P25 | J5 1 | Self Assessment "Income sources" header | 320, 375; both | A second add button beside the heading squeezes the description to one letter a line at 320 and 375 | H13, owner's eye | gets in the way | `SectionHeader` with an action at phone width | Drop the duplicate action (the page has one primary) or stack it below the heading |
| P26 | J2 7 | History chart | all | The net worth chart has no month labels on the x-axis | C7 | gets in the way | Ticks hidden at phone width | Show at most 4 short month ticks on a phone |
| P27 | J2 1 | Home | all | Two notices show together ("Setup finished" with an illustration, and "November balances not recorded yet"), and the setup body repeats its heading | E8, O4 | gets in the way | Both rows render when both are true | Show one: the check-in row replaces the setup row once setup is finished |
| P28 | J2 2, J4 2 | Add account and Add savings sheets | all | The two sheets lay out their buttons differently (stacked and enabled when empty, against side by side and disabled) | SG 12, owner's eye | cosmetic | Separate form footers | One sheet footer: primary full width above Cancel, same enabled rule |
| P29 | J2 4, J8 | Disabled primary button in dark | 375 dark | A disabled primary is a near-black pill on a dark panel that reads as another button style, not as disabled | A1, owner's eye | gets in the way | Dark disabled token for the primary fill | Use the muted surface and muted text tokens for disabled in dark |
| P30 | J4 3 | Edit debt sheet | all | "Delete debt" is a plain outlined button under Cancel, with nothing marking it as destructive | D3 | gets in the way | Shared footer without a danger tone | Separate it from the primary and give it the danger text style (the confirm stays as is) |
| P31 | J2 7, J7 1 | Check-in sheet, `packages/ui/src/primitives/Sheet/Sheet.tsx:82` | all | The sheet shows a drag handle that does nothing, and a large empty area below the buttons with the illustration clipped at 320 | R9, owner's eye | cosmetic | The handle is decorative (`aria-hidden`, no gesture) | Remove the handle (no fake native chrome, R9); size the sheet to its content |
| P32 | J2 3 | Breathing room info tip | 320 | The popover opens over the header edge and its trigger's highlight covers the end of the heading | owner's eye | cosmetic | Popover side and collision padding | Collision padding of the header height; place below on a phone |
| P33 | J2 3 | Edit budget at 320 | 320 | After "Edit budget" nothing in the first screen changes but the button label | owner's eye | gets in the way | The wizard starts below the fold | Scroll the wizard's first step into view, or put a step heading at the top |
| P34 | J2 2 | Accounts header links | all | "See how it has changed" is indented about 5px from the text around it and styled differently from "Change what counts" beside it | owner's eye (siblings uneven) | cosmetic | Link-variant Button padding against an inline link | Use one link style for both, aligned to the text edge |
| P35 | J2 1, J2 2 | Home against Accounts below the hero | all | The gap below the hero is about 45px on Home and 10px on Accounts | owner's eye (inconsistent padding) | cosmetic | Page-specific spacing | `PageBody` gap tokens on both |
| P36 | J8 | Imports, the missing-import and missing-account pages | all | These pages use a 28px side gutter where every other page uses 16px | SG 4, owner's eye | cosmetic | Not wrapped in `PageBody` | Wrap in `PageBody` |
| P37 | J8 1 | Settings | all | A large gap above the tabs and a tight one below; "Download your data" sits alone in an oversized card | owner's eye | cosmetic | Settings layout spacing | Even the tab spacing; size the card to its content |
| P38 | J2 2 | Nav drawer and Debt page | all | The drawer says "Debt and borrowing" but the page it opens is titled "Cards and loans" | N1, N4 | cosmetic | Two labels for one section | One label in `navConfig.ts` and the page h1 |
| P39 | J5 4 | Mortgage rental card | all | "Rent left after the mortgage payment" shows "+£484.00", with a sign and pence, where every other figure is whole pounds | H8 | cosmetic | Its own formatter | `useFormatCurrency` whole pounds, no sign |
| P40 | J5 4 | Mortgage scenario empty state for the buy-to-let | all | The overpay tool asks to "Add your balance, interest rate and years left" while the saved balance and rate show above it | F8, S7 | gets in the way | The zone reads the residential mortgage fields only | Start from the selected mortgage's saved figures |
| P41 | J5 5 | Home value notice | all | "Your home's value is not counted until you add an estimate" shows while Accounts lists the home at £240,000 in the total (`NetWorthBasisLine.tsx:13`) | T7 | gets in the way | The notice reads the profile's home value, not the property account | Show it only when no property account and no profile value exist |
| P42 | J4 1, J5, J6 | Hyphenated labels in KPI and detail rows ("Debt-free date", "Interest-only") | all | Hyphens render with wide gaps, as if tabular numbers were applied to the label text | SG 3.3 | cosmetic | `tabular-nums` on the whole card | Apply `tabular-nums` to the figure only |
| P43 | J6 (200% text) | `HeroFigure` | 375 light | At 200% text the hero figure breaks mid-number ("£592,70 / 0") | A6, owner's eye | gets in the way | The figure may wrap | `white-space: nowrap` on the figure with a fluid size that fits the card |
| P44 | J4 2 | Add debt and add savings name placeholders, info icon placement | 320 | Placeholders are cut ("car lo", "easy access saving"); the info icon follows the APR label but sits far right on the wrapped "Minimum payment" label | F1, owner's eye | cosmetic | Long placeholder text; label flex layout | Shorter placeholders; keep the icon after the label text |
| P45 | J8 1 | Settings name fields, account menu items | all | First and last name inputs are 42px tall; account menu items are 40px (`AvatarMenu.styles.ts:52-58`) | A5 | cosmetic | `TextInput` md height; `AvatarMenu` has no min-height | `minHeight: "touch"` on coarse pointers for both, or build the account menu on `@repo/ui` Menu |
| P46 | J2 1 | Home logo link | 320 | Only on Home, an underline sits under the logo like a current-page marker | owner's eye | cosmetic | Active link style on the logo | No current-page style on the logo |
| P47 | J1 | `ConnectBankWizard`, `BankConnectionsList` | n/a | Imported by no page: dead code | owner's eye | cosmetic | Left from an earlier plan | Remove in phase 2 (no user effect) |
| P48 | J5 1, J9 1 | Self Assessment bill card, `apps/web/app/containers/tax/TaxContainer.tsx` | 320; both | The "Add income or expense" button runs out of its card and off the screen, so the page scrolls sideways | A6, R1, WCAG 1.4.10 | gets in the way | A nowrap button with a long label inside a padded card | Let the button take the card's width and wrap its label, or shorten it to "Add income" with the menu naming both |
| P49 | J2 9 (200% text) | `PageHeader` illustration slot | 375 light | At 200% text the 40px header illustration does not scale and overlaps the first letters of the description | A6 | gets in the way | Fixed-size illustration beside rem-sized text | RC-1: hide the header illustration at large text sizes or stack it above the description |
| P50 | J9 1, J2 1 | `PageHeader` on pages with no description (empty Debt, Mortgage, Pension; Home) | 320 to 430 | The illustration sits alone on its own row under the h1, about 60px of space for nothing | owner's eye | cosmetic | RC-1: the illustration is placed in the description row | RC-1: no illustration row when there is no description |
| P51 | J2 3 | Budget header actions | 320 | Two header buttons of different widths ("Add common budget items" wraps, "Edit budget" does not) squeeze the h1 and push the description a row lower | H13, owner's eye | gets in the way | RC-1 with two actions | One header action; the second moves into the page or a menu |
| P52 | J9 1 | Empty Budget | all | Two calls to action with different names ("Set up your budget" in the header, "Add common entries" in the empty state), neither matching "Add common budget items" on the filled page | E4, H13 | gets in the way | Header action kept on the empty page | Header plus one `EmptyState` with one button, named as on the filled page (overlaps ux-batch-g, budget page) |
| P53 | J2 | Header illustrations | all | Take-home, History, Settings and Retirement have no header illustration while the other pages do, and Accounts, Mortgage, Self Assessment and the error state share one wallet scene | SG 8.2, owner's eye | cosmetic | Partial adoption in PR 779 | Map one scene per section in the illustration map, or none on those pages by rule |
| P54 | J9 1 | Empty Self Assessment | all | No `EmptyState`: a "Not set" bill card with an oversized button, unlike every other empty page | E4 | gets in the way | `TaxContainer` renders its full layout when empty | The page's `EmptyState` with one button |
| P55 | J9 1 | Empty Budget and Debt | all | The MoneyHelper notice shows under the empty state | E4 | cosmetic | Notice rendered unconditionally | Leave the notice out of the empty page (fixed wording itself unchanged) |
| P56 | J1 5 | Onboarding progress | all | The progress bar fills only visited steps, so after "Skip this step" step 4 shows segments 1 and 4 filled and 2 and 3 empty | owner's eye | gets in the way | Progress counts visited, not reached | Fill every step up to the current one |
| P57 | J1 5 | Onboarding step change, `apps/web/app/features/onboarding/components/OnboardingFlow` | 375; both | Step 3 opens scrolled down with "Step 3 of 4" cut at the top | owner's eye (same class as O-1) | gets in the way | The window keeps its scroll position across steps | Still present after PR 781 (the step title is cut at the top at 375). Scroll to the top of the step and focus its heading on each step change |
| P58 | J1 5 | Onboarding header and salary chips | 320 | "Set up Flump" wraps beside "Save and exit"; the example-salary chips wrap unevenly (one chip, then two) | owner's eye | cosmetic | Header and chip row widths | Shorter header row; chips in an even grid |
| P59 | J6 2 | Retirement plan, `apps/web/app/features/retirement/components/RetirementPlanner/RetirementPlanner.tsx` | all | All ten inputs are 14px (iOS zoom) and 40px tall, set out as one long plain form with the headline "Not set" above it | R7, A5, R2 | gets in the way | Own inputs, not `CurrencyInput`, `PercentInput` or `SliderField` | Use the shared inputs (16px, 44px on touch); layout is ux-batch-g's shared number inputs work |
| P60 | J1, J9 | Calculators on marketing and `/tools` (pay rise, balance transfer, overdraft, mortgage, 100k, section 24) | all | The calculators' value inputs are 14px (iOS zoom), and at 320 slider labels wrap to two or three lines beside the value pill | R7, owner's eye | gets in the way | RC-3 (`SliderField`) | RC-3 |
| P61 | J2 4, J3 2, J11 | Take-home (both tabs) and Mortgage (page and its scenario tabs) | 320 to 430; both | The layout shifts after it renders (CLS 0.13 to 0.19 on every persona) | WCAG 2.2 2.4.11 related, owner's eye | gets in the way | Content sized after the tab's data or chart renders | Reserve the chart and result heights |
| P62 | J3 2, J5 4 | Mortgage "Your details" and "Let properties" headers | 320, 375 | An Edit button beside the description squeezes it to three or four words a line | owner's eye | cosmetic | RC-11 | RC-11: below `sm` the action goes under the text |
| P63 | J2 4, J6 2 | "What could your savings do?" and the retirement accounts card | 320, 375 | Text squeezed beside its button, as P24 | owner's eye | cosmetic | RC-11 | RC-11 (overlaps ux-batch-g, collapsible what-if zones) |
| P64 | J2 3 | Housing (edit rent) sheet | all | A third footer pattern: a small left-aligned Save with no Cancel; its description "This updates your details." says little | SG 12, owner's eye | cosmetic | RC-12 | RC-12: one sheet footer; say what is saved ("Saves your rent to your details") |
| P65 | J2 4 | Savings grouped list | 375 | Under the new grouped kinds the "Easy access savings" row shows no balance, only its name and a pencil | H6 | gets in the way | Row template for a grouped kind | Show the row's one figure |
| P66 | J3 2 | Edit mortgage dialog | 320 | The "Saved on your mortgage account" helper wraps inside the half-width Years column and the account select truncates to "(£186…" | owner's eye | cosmetic | Two-column field row at 320 | One column below `sm` |
| P67 | J2 3 | Budget suggested categories | all | The chip "Health & Fitness" uses an ampersand and title case | copy guide | cosmetic | Suggestion list text | "Health and fitness" |
| P68 | J2 2 | "Connect AI" icon | all | A sparkle icon in the drawer and a robot icon in the account menu | SG 7, owner's eye | cosmetic | Two icon choices | One icon in `navConfig.ts` and `AvatarMenu` |
| P69 | J2 3 | Budget bill-move notice | all | "Keep it here" is a borderless text button beside the outlined "Move to debts" | owner's eye (siblings uneven) | cosmetic | Mixed button variants | Both secondary, or a text pair |
| P70 | J1 2 | Marketing menu, `apps/marketing/src/components/Header/Header.tsx` | all | The side is fixed by PR 781, but the page behind the open menu is still not scroll-locked | R4 | gets in the way | Shares `NavDrawer` | Fix with P11 in the shared drawer |
| P71 | J1 2 | Marketing menu items | 320 | "AI connection" wraps to two lines so that item is taller than the others; each subtitle repeats its label; no Contact link | owner's eye (one item spaced differently), N8 | cosmetic | Item copy and list | Shorter subtitles that add meaning; add Contact |
| P72 | J1 1 | Marketing header, landscape | 812x375 | The hamburger shows beside the inline links, so the navigation appears twice; the hero card is fully below the first screen | owner's eye | cosmetic | Header breakpoints | Hide the menu button once inline links show; reduce hero top padding in short viewports |
| P73 | J1 3 | Marketing page tops (Tools index against Pricing, Security, Contact); Preview section gap | 320 to 430 | The Tools heading starts about 90px down where others start at 115 to 130px; Preview has an extra-large gap before "Dashboard picture" | owner's eye (inconsistent padding) | cosmetic | Page-level spacing | One `MarketingSection` top spacing |
| P74 | J1 1 | Marketing home | 375 | The FAQ heading is centred while every other heading is left-aligned; one feature card's icon tile is untinted while the others are tinted | owner's eye (siblings uneven) | cosmetic | `HomeFAQ`, feature cards | Left-align; tint all three or none |
| P75 | J1 3, J9 2 | Tool guide rows and debt calculator rows, `packages/ui/src/tools/ToolGuide/ToolGuide.tsx`, `DebtSnowballCalculator.tsx` | 320, 375 | "Guide · 3 sections" fits one line but "Frequently asked questions · 3 questions" wraps; debt names wrap to three lines beside Edit and Remove | owner's eye | gets in the way | Row layouts at narrow widths | Count on its own line; actions under the name below `sm` |
| P76 | J9 2 | Not-found and account-deleted cards | 320 | Card side insets differ (12px, 28px, 16px), and "Go to the Flump homepage" wraps and says "homepage" where the 404 says "home page" | SG 4, copy guide | cosmetic | Separate page wrappers | `PageBody` gutters; "Go to the home page" |
| P77 | J1 3 | Tool card icon tiles and the 404 sun, dark | 375 dark | Dark brown tiles on a dark card barely show | A1 (non-text contrast 3:1 for meaningful icons) | cosmetic | Tint token in dark | Dark `tint.apricot` with more contrast against `surface.card` |
| P78 | J10 | Accounts and Budget, landscape | 812x375 | In landscape the hero figure starts at 245px of 375, so the h1 and the headline are not both in the first view | H3 | cosmetic | Header 67px plus page header in a short viewport | Compact page header below 480px tall |

| P79 | J11 5 | Self Assessment "Add a record" dialog, `apps/web/app/containers/tax/` record dialog | 320; both | The dialog is wider than the screen: no left inset, fields and the close button run past the right edge, and the page scrolls sideways | A6, R1, WCAG 1.4.10 | gets in the way | A fixed or min width on the dialog content above 320px | Fit the dialog to the viewport (`maxWidth: 100%`, the Sheet's phone layout) |
| P80 | J2, J3, J11 (Back) | Web scroll restoration, `apps/web/app/root.tsx` | 320 to 430; both | First read: Back landed at the top on 22 of 135 tries. Phase 2 diagnosis: all but Mortgage were the sweep reading the position before Back's data loaded (0 misses in 84 tries once it waits); the real fault is P13 | owner's eye (same class as O-1) | gets in the way | The sweep's timing, plus P13 | Sweep now waits for the URL and a still scroll position; P13 fixed in phase 2 |

## Overlaps with other lanes

- **phone-nav-fixes** (PR 781, merged) owned O-1 to O-5; their status is above. Left after it:
  P11 and P70 (drawer scroll lock), P12, P13 and P80 (scroll after closing an overlay and after
  Back; P80 was traced to the sweep), P14 and P57. Phase 2 takes these.
- **ux-batch-g** (PR 783, merged 19 November 2026). Re-checked on the new `main` after it merged:
  - Fixed by PR 783: the add-debt date field (now `DatePicker`), P24, P30, P51, and the savings
    part of P63.
  - Fixed in phase 2 after the rebase: P08, P59, P60 and the 14px pension "Your contribution"
    field (the `SliderField` value pill is now 16px), P23 (the second hero figure is named first),
    P33 (Edit budget moves focus to the editor), P52 (one action on the empty page, named "Add
    common budget items" as on the filled page), P55 (the notice is left out of the empty Budget
    and Debt pages), P69 (equal weight) and P32 (popovers keep clear of the sticky header).
  - Needs a check on a phone: P26 (month ticks on the line chart) and the retirement accounts
    drawer row in P63.

## Out of scope, noted in passing

- Pre-launch placeholders on marketing and in footers ("support@example.invalid", "Company number
  00000000", "address to be confirmed") are known placeholders, not phone faults.
- The signed-out web footer and the marketing footer differ in columns and wording (N8 asks for
  help and security in the same place on every surface; both footers have them).
- `/signup` answered 500 locally because the hosted sign-in is not configured in the test
  environment; the page showed the normal error card. `/login` with the test-only dev session
  signs straight in. Neither says anything about staging.
- Marketing tinted bands: owner decision D16 allows sage and apricot section bands on marketing,
  so the home page's bands are not a finding.

## Could not reach, and what needs a real device

- **The on-screen keyboard.** The iOS Simulator is not available on this machine (only the Xcode
  command line tools are installed, so `simctl` is missing). Desktop emulation shows no
  keyboard, so nothing here confirms how fields move when the keyboard opens, whether the focused
  field and its label stay visible, or whether the submit button is reachable with the keyboard
  open (O-3, F-rules, R4). The field walk only rules out jumps caused by scripts.
- **iOS Safari zoom** (P08, P09) is inferred from the 16px rule, not seen.
- **Safe areas** (P15) need a notched phone in landscape; Chromium reports zero insets.
- **Scroll after navigation** (O-1) is fixed in Chromium; the owner's phone is the final check.
- **J11 overlays the sweep could not open** with the densest data: edit account (11 accounts sit
  behind "Show all"), the housing-mortgage sheet, the mortgage tip, Self Assessment row actions,
  the year menu and delete record (records collapsed under "Records"), and import undo. Each was
  opened by the smaller personas on earlier runs and is recorded there.
- **Receipts** (`/app/tax/receipts/:id`, O17) need an uploaded file; the seed writes none.
- **Retirement plan** is a friends-beta page: the backend answers 404 unless the user is listed
  in `RETIREMENT_ALLOWED_USER_IDS`. The first run hit that 404; the second run listed the local
  dev user on the local test backend only.
- **Copy from last year** with records to copy needs an earlier tax year with records.
- **Disconnect AI** needs a connected client; J11 seeds one.

## Decisions

None needed from the owner. Choices this lane makes and states in phase 2:

- Tab rows on a phone (P06): wrap to a grid of equal cells below 400px rather than shorten the
  approved labels.
- The budget hero's second figure (P23): reworded or moved out of the hero, within the copy guide.
- Not a finding: debt shown in apricot (`chart.debt`, `surface.tint.apricot`) was checked against
  STYLE-GUIDE rule C2. Apricot is the approved colour for what you owe and is not a warning.

Nothing here changes stored user data, names an outside service or needs a security exception.
The sweep's local backend lists the dev user in `RETIREMENT_ALLOWED_USER_IDS` for the run only; no
repository or deployed setting changes.
