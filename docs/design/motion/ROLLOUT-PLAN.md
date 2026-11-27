# Marketing design language rollout plan

Decisions: D1 to D6 accepted as recommended by the owner on 27 November 2026 ("Everything looks good with the recommendations"; on D6: "happy to rewrite these rules to fit the new approvals").

Written 27 November 2026 from a read-only review of `main` and of branch `claude/marketing-motion-prototypes-66c08d` (commit 015481a1d). Nothing was run and no files were changed.

## What I could not verify, and what differs from the brief

- **The redrawn illustrations are not in `packages/ui`.** `packages/ui/src/primitives/Illustration/Illustration.scenes.tsx` is identical on the branch and on `main`. The redrawn pictures live in `apps/marketing/prototypes/p11/art/Pictures.tsx` on the branch (nine named pictures plus `SecurityPicture` and `TilePicture`).
- **The prototype is plain CSS, not Panda.** Prototype 11 is about 10,600 lines, roughly 4,000 of them CSS with class names. Production is a rewrite into colocated Panda components, not a move.
- **The prototype already has a still path.** `prototypes/shared/useLazyScene.ts` shows a still image for data saver, under 4 GB memory, under 4 cores, no WebGL, or under 28 fps. "Same experience everywhere" is therefore already not literally true (decision D2).
- **The current rules forbid parts of the approved design.** `docs/ux/UX-GUIDELINES.md` M1, M3, M5 and M7 and `docs/ux/STYLE-GUIDE.md` 8, 8.2 and 11.1 ban decorative motion, counting figures, outlined art and scenes on pricing. STYLE-GUIDE line 113 requires the solid mint band and the charcoal closing band the owner has now rejected, and page tests enforce them.
- I found no bundle-size or Lighthouse check in `.github/workflows` or `scripts` by keyword search.
- All measurements are the lane's, on a Mac. I did not re-measure.
- Library costs in section 5 are from general knowledge, not measured in this repo.

## 1. The design language in one page

**Principles (a builder follows them, a reviewer checks them)**

| #   | Rule                                                                                                          | Check                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| P1  | The page is complete and still before any script runs. Motion is an enhancement.                              | Server HTML, no-JavaScript and reduced-motion screenshots match the finished state |
| P2  | Scroll triggers, time completes. A changeover plays leave, beat, arrive to the end. Nothing rests half-faded. | Unit test of the helper; no scrubbed opacity on content                            |
| P3  | Content holds still while it is being read. At a journey stop only the orb moves.                             | Review; no transform on text while a stop is at rest                               |
| P4  | One calm speed scale from tokens. No overshoot, bounce, warp or skew.                                         | `scripts/check-style-literals.ts`                                                  |
| P5  | Mint leads. Violet and rose appear only on orb-like elements.                                                 | New token check (section 2)                                                        |
| P6  | Colour never signals judgement. Debt is never rose.                                                           | `scripts/check-judgement-tokens.ts`                                                |
| P7  | Images are tilted cards and paper documents with sample content and an "Example" tag.                         | Review; the tag is real text                                                       |
| P8  | Nothing covers or clips: no orb over a heading or cut by an edge, no fog over content.                        | Visual baselines at 375 and 1280                                                   |
| P9  | Sideways content shows dots and has real buttons.                                                             | Keyboard test, axe                                                                 |
| P10 | Figures stay tabular. A screen reader gets the final value at once.                                           | `scripts/check-tabular-nums.ts`; DOM test                                          |

**Building blocks**

| Block                             | What it is                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| Orb                               | A lit 3D sphere (three.js) with a still image fallback                                       |
| Bubble field                      | Soft drifting circles behind content, CSS only, in the two colour sets                       |
| Bead track                        | The winding dotted path the orb rolls along                                                  |
| Glass card                        | Card material: soft border, faint inner light, no top border on hover                        |
| Document card                     | Tilted bank card, payslip, budget slip, statement, calendar page or ticket, tagged "Example" |
| Tilt-and-light hover              | Pointer light, a moving gradient and up to six degrees of tilt (from prototype 1b)           |
| Entrance                          | A card or tag arriving once, staggered                                                       |
| Count-up                          | A sample figure counting to its value once                                                   |
| Self-drawing chart                | Breathing room, savings line, debt payoff drawing once                                       |
| Unfolding payslip, accounts tiles | The two approved set pieces                                                                  |
| Triggered changeover              | Leave, beat, arrive, started by scroll and finished by time                                  |
| Receding scene                    | A tinted overlay and soft blur behind the content at a stop                                  |
| Carousel with dots                | Sideways features, dots, previous and next buttons                                           |

**Never:** fog over content; warped or distorting entries; fast motion; solid colour bands; hover top borders; half-finished states; large empty gaps; clipped orbs or orbs over headings; out-of-order or overlapping FAQ items; glass objects in illustrations; bubble icons on feature tiles; violet or rose as a tint, gradient or background; "4 to 5 of 6" counts.

## 2. Foundations to build first

**Where each block lives**

| Thing                                                            | Home                                                                                    | Why                                                                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Calm durations and easings                                       | `packages/tokens/src/motion.ts`                                                         | Mobile reads the same values through `native.generated.ts`                                                  |
| Orb colour sets `orb.skyTeal.*` and `orb.violetRose.*`           | `packages/tokens/src/index.ts`                                                          | The prototype borrows `surface.tint.*` (`prototypes/shared/kit3.css:102`), which invites use as a card tint |
| Document card pictures, "Example" tag, glass card, carousel dots | `packages/ui/src/primitives` and `patterns`                                             | Shared by marketing and web; no animation library needed                                                    |
| Changeover state machine, count-up, tilt-and-light, power policy | `packages/ui/src/hooks`, beside `usePrefersReducedMotion.ts` and `useChartAnimation.ts` | Pure logic, tested without a browser                                                                        |
| Orb, bead track, journey, GSAP timelines                         | `apps/marketing/src/components` only                                                    | Keeps GSAP and three.js out of anything the web app imports                                                 |

I recommend no new motion package. A law test should fail if `gsap` or `three` is imported outside `apps/marketing`.

**Motion tokens.** Prototype 11 uses `TIMING` in `prototypes/shared/pace.tsx` multiplied by 1.4. Fix those products as the one scale: hover about 590 ms, entry 1,540, stagger 196, disclosure 980, count 2,240, chart 2,660, hero 4,760. The easings are "calm" `(0.25, 0.1, 0.2, 1)` and "calmInOut" `(0.45, 0, 0.3, 1)`. Name them as a marketing scale so the app's `fast`, `base` and `slow` are untouched. Drop the Medium and Brisk settings.

**Trigger-and-complete helper.** One state machine: rest, leaving, beat, arriving, rest. A new trigger during a changeover queues the latest target and never interrupts. Tests cover each transition, rapid scrolling both ways, and unmount mid-play.

**Reduced motion and low power.** Reduced motion gives the finished still page and never loads GSAP or three.js (as `prototypes/shared/useGsap.ts` does). Low power keeps all layout and content and swaps the 3D orb for a still. Port the hidden-tab pause, off-screen pause and frame-rate fallback from `prototypes/shared/threeKit.ts`.

**Performance budget, as ratchets**

| Measure                                    | Budget        | Measured                           |
| ------------------------------------------ | ------------- | ---------------------------------- |
| Extra first-load script, home              | 25 KB gzip    | 20.5 KB                            |
| Extra CSS, home                            | 25 KB gzip    | 21.9 KB                            |
| Lazy script after first paint              | 230 KB gzip   | 224 KB                             |
| Layout shift                               | 0.05          | 0.018 to 0.045                     |
| Longest main-thread stall, throttled phone | 200 ms        | about 730 ms. Fails; cause unknown |
| Frame rate in the journey                  | 55 fps median | 60 on a Mac                        |
| Smallest text                              | 12 px         | Passes                             |

CI: turn `prototypes/tools/measure-weight.ts` into a `scripts/` check with a baseline file, run after the build. Raising a baseline falls under the Guard Changes law. Timing measures run as an advisory Playwright job in `apps/e2e`, like `visual-regression.yml`.

**Prototype to production.** For each block: a colocated directory, Panda styles with semantic tokens, stories in light and dark showing the rest state and the reduced-motion state, tests that assert specific states, the four local checks, then CI. Every PR names the review-only rules it checked.

**The `/prototypes` route.** Never merge it. Keep the branch as the reference, and copy the chosen picture sheet into `docs/design`. Production builds already resolve a stub (`apps/marketing/vite.config.ts` on the branch), but `main` should not carry the directory or the alias.

**Slices**

| Slice | Content                                                                                                                                                                 | Agent-days |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| F1    | Rule changes: amend STYLE-GUIDE 8, 11 and line 113 and UX-GUIDELINES M1, M3, M5, M7 with a marketing exception; record the decisions in `docs/audit/plans/DECISIONS.md` | 1          |
| F2    | Tokens: calm scale, orb sets, glass and paper material, the orb-only colour check                                                                                       | 2          |
| F3    | Document card pictures, "Example" tag, glass card, carousel dots in `packages/ui`                                                                                       | 4          |
| F4    | Hooks, the import ban, the weight check in CI                                                                                                                           | 3          |

## 3. Marketing rollout

Routes come from `apps/marketing/src/App.tsx` and `apps/marketing/src/utils/toolSlugs.ts`.

| Page (on main)                                     | Sections today                                                                                                                                                                                | Gets                                                                                                                                                                                | Must not get                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/` Home                                           | Hero with `BaselineSnapshotPreview`; `FeatureTiles`; rough figures steps; more detail; `PayRiseTeaser`; `SecurityPrivacySection` on a solid mint band; `HomeFAQ`; `ClosingCta` on a dark band | Prototype 11: assembling hero, features carousel with dots, six-stop journey, calendar picture, pay rise tool, security picture, FAQ opening in order, calm close, both bubble sets | Solid mint band, abrupt dark band, orbs over headings, bubble icons on tiles |
| `/features`                                        | Header, `StartHere`, `FeatureIndex`                                                                                                                                                           | Entrances, tilt-and-light on cards, bubble field                                                                                                                                    | Journey, three.js                                                            |
| Five `/features/<area>` pages                      | Hero, "What you see", sample preview, retirement (one page), more detail, `AreaStrip`, `TryItSection`, `ClosingCta`                                                                           | One document card each, one self-drawing chart or set piece (payslip on pay, tiles on accounts), entrances                                                                          | Count-up inside the interactive sample preview, three.js                     |
| `/features/ai-connection`                          | Hero, questions, setup, technical drawer                                                                                                                                                      | Entrances, one document card                                                                                                                                                        | Orbs near code or setup steps                                                |
| `/pricing`                                         | Plan card, paid line                                                                                                                                                                          | Glass card, hover light                                                                                                                                                             | Count-up on prices, pictures beside prices                                   |
| `/preview`                                         | Dashboard, check-in and breathing room previews, `ClosingCta`                                                                                                                                 | Entrances on frames, new pictures at lines 107 and 166                                                                                                                              | Motion inside the previews                                                   |
| `/security`, `/contact`                            | Prose, `DisclosurePolicySection`                                                                                                                                                              | Security document card, glass cards                                                                                                                                                 | Bubbles behind long text                                                     |
| `/privacy`, `/terms`, `/cookies`, `/accessibility` | `LegalPage`                                                                                                                                                                                   | Tokens and material only                                                                                                                                                            | Any motion                                                                   |
| Not found                                          | Card with the not-found scene                                                                                                                                                                 | New ticket picture, one small still orb                                                                                                                                             | Journey                                                                      |

**Order**

| Slice | Content                                                                               | Agent-days |
| ----- | ------------------------------------------------------------------------------------- | ---------- |
| M1    | Home without the journey: hero, carousel, bands, FAQ, close, new band rules and tests | 4          |
| M2    | Journey: orb, bead track, changeovers, receding scene, still fallback. Needs D1       | 4          |
| M3    | Features index, five area pages, AI connection                                        | 3          |
| M4    | Pricing, preview, security, contact                                                   | 2          |
| M5    | Legal pages, not-found, final baselines                                               | 1          |

**SEO and no JavaScript.** All copy is server-rendered in reading order, including every journey stop and carousel item. Without JavaScript the journey is a plain vertical list and the carousel scrolls natively. Count-up figures are rendered at their final value. The canvas is decorative and hidden from assistive technology. `PageMeta` and the sitemap do not change.

**Image replacement.** The nine live scenes are `empty-accounts`, `empty-goals`, `empty-savings`, `empty-debt`, `empty-pension`, `check-in`, `check-in-done`, `onboarding` and `not-found`. Marketing uses three of them, in `HomePage.tsx:149,193`, `PreviewPage.tsx:107,166` and `NotFoundPage.tsx:42`. The web app, under `apps/web/app`, uses all nine:

| Scene                         | Web app use                                                                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `empty-accounts`              | `AccountsContainer.tsx:118`, `TaxContainer.tsx:136,408`, `TaxSourceContainer.tsx:215,318`, `MortgageContainer.tsx:1035`, `MortgageEstimatesContainer.tsx:266`, `routes/household.join._index.tsx:168`, `routes/invite._index.tsx:81`, `routes/callback.tsx:90`, `RouteErrorState.tsx` |
| `empty-goals`                 | `HomeDashboard.tsx:389`                                                                                                                                                                                                                                                               |
| `empty-savings`, `empty-debt` | `SavingsContainer.tsx:195`, `DebtContainer.tsx:275`                                                                                                                                                                                                                                   |
| `empty-pension`               | `PensionContainer.tsx:282,299`                                                                                                                                                                                                                                                        |
| `check-in`, `check-in-done`   | `CheckInSheet.tsx:216`, `CheckInSummary.tsx:74`                                                                                                                                                                                                                                       |
| `onboarding`                  | `BudgetContainer.tsx:584`, `AccountDetails.tsx:97`, `RouteErrorState.tsx`                                                                                                                                                                                                             |
| `not-found`                   | `RouteErrorState.tsx`                                                                                                                                                                                                                                                                 |

Add the document style as a second style on the `Illustration` primitive. Marketing opts in page by page; the web app keeps flat scenes until D4. STYLE-GUIDE IL4 wants scenes stored as shape lists so mobile can draw them. Keep that format.

**Visual baselines.** `apps/e2e/visual/routes.ts:61-65` shoots home, pricing, features and two feature pages at 375 and 1280, light and dark. Add preview, security and not-found. Shots run with reduced motion so they capture rest states. Each slice regenerates its own baselines through the workflow's update input.

## 4. Web app

**Tiers**

| Tier                  | Rule                                                    | Items                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A, always fine        | Changes no layout, timing or reading order              | Tokens, glass card material on non-data cards, document pictures in empty states, focus and hover light with no tilt and no movement                                                             |
| B, named moments only | Once, after the content is readable, never on a control | Chart draws once per visit (already governed by `useChartAnimation`), the check-in completion picture settling, onboarding step entrances, setup progress (already approved in STYLE-GUIDE 11.1) |
| C, never in the app   | Delays reading or moves a control                       | Scroll-driven scenes, the journey, three.js or WebGL, parallax, bubble fields behind data, tilt on cards holding figures, count-up on real money, carousels for data                             |

**Count-up on money.** I recommend never in the app. UX-GUIDELINES M3 already says a counting figure "shows amounts that were never true", and a person glancing mid-count could read a wrong balance. The saved-figure cross-fade and wash in `useSavedFigureChange.ts` already mark a change honestly. Count-up stays on marketing, on sample figures tagged "Example", with the final value in the HTML. If the owner wants it in the app later, limit it to non-money values such as setup progress.

| Screen                            | A                             | B                               | Why                                                                                                                                                     |
| --------------------------------- | ----------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home dashboard                    | Material; empty-goals picture | Chart draw once                 | Seen daily; the hero figure must be readable at once                                                                                                    |
| Accounts, account detail, history | Material; empty picture       | History chart draw once         | Dense lists; no entrances on rows                                                                                                                       |
| Budget                            | Empty picture                 | None                            | Sliders redraw live; animation lags the pointer                                                                                                         |
| Pay, self assessment, tax         | Empty picture                 | None                            | Tax figures unchanged and never animated                                                                                                                |
| Savings, pension, retirement      | Empty pictures                | Chart draw once                 | Forecast lines stay dashed                                                                                                                              |
| Debt, mortgage                    | Empty pictures                | Chart draw once                 | No rose, no celebration on payoff                                                                                                                       |
| Onboarding                        | Document pictures             | Step entrances under 320 ms     | One-off flow; the best place for warmth                                                                                                                 |
| Check-in                          | Calendar pictures             | Completion picture settles once | M5 allows it: a saved state, not a financial event                                                                                                      |
| Settings, invites, imports        | Tokens only                   | None                            | Utility pages                                                                                                                                           |
| Empty and error states            | Document pictures             | Settle once per visit           | Already allowed for empty states. Error states stay still; they use the same primitive through `RouteErrorState.tsx`, so the settle must stay off there |

**The questions raised**

- **Daily use.** Tier B plays once per visit. Nothing replays on tab changes or refetches.
- **Data density.** No blur, overlay or bubbles behind any figure, table or chart.
- **Low-end devices.** The app gains no animation library, so the cost is CSS only.
- **CSP.** `apps/web/app/security/csp.server.ts` allows inline styles and has no worker rule, so blob workers fall back to `'self'` and are blocked. WebGL itself is not restricted. Tiers A and B need no CSP change. The marketing CSP in `apps/marketing/server/security.ts` has the same shape. The prototype scene imports only three.js and `RoomEnvironment` (no loaders or workers), so I expect no exception, but the M2 lane must confirm that with a production build.
- **Test stability.** Playwright, the visual job and the axe job run with reduced motion. Tests assert rest states, never mid-animation frames.
- **three.js in the app.** Bar it entirely, enforced by the import ban in F4.

| Slice | Content                                                            | Agent-days |
| ----- | ------------------------------------------------------------------ | ---------- |
| W1    | Tier A: material and hover polish through `packages/ui`, baselines | 3          |
| W2    | Document pictures in empty states, if D4 says yes                  | 2          |
| W3    | Tier B moments, each with a reduced-motion test                    | 2          |

## 5. Mobile app

`apps/mobile/package.json` has `react-native-svg` and no animation or haptics library. GSAP and three.js do not carry over.

| Option                        | Cost                                                            | Verdict                                                              |
| ----------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| React Native's own `Animated` | Nothing new                                                     | Enough for press feedback and fades                                  |
| Reanimated                    | A native module and a new dev-client build; small binary growth | Recommended, for chart draw and smooth press states                  |
| `expo-haptics`                | Small native module                                             | Recommended; CROSS-PLATFORM section 5 already asks for light haptics |
| Skia                          | Several MB per platform; continuous drawing costs battery       | Not for the first release                                            |
| Lottie                        | Native module; animations authored in an outside tool           | No                                                                   |
| Rive                          | Native runtime; proprietary editor, an outside service to flag  | No                                                                   |

**Translates:** document pictures drawn from the shared shape list with `react-native-svg`; chart draw; card press feedback with haptics; one still or gently breathing orb on sign-in and empty states. **Does not translate:** the journey, bubble fields behind lists, tilt (no pointer), blur overlays, count-up on money.

**Placement.** A small design slice, "S9b", after S9 and before S18: pictures, press feedback and haptics, 3 agent-days. It does not block S19. S18 then measures it during the performance and screen-reader audits. Reanimated and chart draw wait for the first chart screens (S10 to S13), about 3 more days.

**Parity rule.** Same moments, same meaning: if the web plays something at a moment, mobile marks the same moment in its own way, and never adds one the web lacks. UX-GUIDELINES M6 stands, so navigation uses platform transitions. Each shared-flow change adds a row to `docs/audit/plans/E12-mobile-parity-log.md`.

## 6. Decisions for the owner

| #   | Decision                                                                                                   | Recommendation                                                                                                                                                                                                                                                                                                                                                                               | Unblocks                 |
| --- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| D1  | GSAP 3.15.1 and three.js 0.187.0 in production, marketing only                                             | Yes, with conditions. GSAP is free for commercial use under Webflow's licence but is not open source. The repo is public, so record the licence in the repo. three.js is MIT. The cost is about 218 KB gzip after first paint, against 75 KB without three.js. Fallbacks: reduced motion loads neither; weak devices get a still orb. Conditions: the budget in section 2 and the import ban | M1 (GSAP), M2 (three.js) |
| D2  | "Same experience everywhere", or a lighter path on weak phones                                             | Same content and layout everywhere; a still orb where the device cannot hold 28 fps. Revisit after real-device numbers                                                                                                                                                                                                                                                                       | M2                       |
| D3  | How far into the apps                                                                                      | Tiers as written: A now, B at the named moments, C never. No count-up on real money                                                                                                                                                                                                                                                                                                          | W1 to W3, S9b            |
| D4  | Web app pictures switch to the document style now                                                          | Yes for empty states and check-in, after M1 ships. Error states stay still                                                                                                                                                                                                                                                                                                                   | W2, the mobile pictures  |
| D5  | Real-device testing before the home page ships                                                             | Yes: one mid-range Android and one older iPhone. The 730 ms stall must be explained first                                                                                                                                                                                                                                                                                                    | M2 release               |
| D6  | Amend the motion and band rules (M1, M3, M5, M7; STYLE-GUIDE 8, 11.1, line 113) with a marketing exception | Yes. Without it every marketing slice breaks a standing rule                                                                                                                                                                                                                                                                                                                                 | F1 and everything after  |

## 7. Risks, done, order

| Risk                                 | Check                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| The 730 ms stall reaches real phones | Profile in M1; budget of 200 ms; D5                                                   |
| Motion sickness                      | No scrubbed transforms on content; reduced-motion path tested per block               |
| Weight creep                         | Weight ratchet in CI                                                                  |
| Flaky visual and axe jobs            | Reduced motion in tests; rest-state assertions                                        |
| Violet and rose leak into tints      | The orb-only token check                                                              |
| GSAP licence terms change            | Version pinned; GSAP stays inside `apps/marketing`, behind the hooks in `packages/ui` |
| The app's trust is degraded          | Tier C import ban; no motion on figures                                               |
| WebGL context loss or battery drain  | Ported pause and fallback logic; real-device run                                      |
| Rules and code disagree              | F1 lands first                                                                        |

**Done, per phase**

- **Foundations:** tokens, primitives and hooks merged with stories and tests; weight check live; rules amended.
- **Marketing:** every page in the table shipped; baselines updated; budgets met on two real phones; no-JavaScript and reduced-motion pages complete.
- **Web:** Tier A and B shipped; no new dependency; axe and visual jobs unchanged in stability.
- **Mobile:** S9b merged; parity log updated; S18 audit clean.

**Order.** D6 and D1 first. Then F1, F2, then F3 and F4 in parallel. Then M1, then M2 (after D2 and D5), then M3 to M5. W1 can start after F3; W2 after D4; W3 last. S9b after mobile S9 and F3.

**Rough effort**

| Phase                         | Agent-days |
| ----------------------------- | ---------- |
| Foundations                   | 10         |
| Marketing                     | 14         |
| Web app                       | 7          |
| Mobile                        | 6          |
| Real-device testing and fixes | 2          |
| Total                         | About 39   |

## 8. Guards to change, and in which slice

Added by slice F1 (27 November 2026). F1 rewrote the rules only; the pages on `main` keep the solid bands until slice M1, so these tests still pin the old design. The slice that changes the page changes its guard in the same PR and lists it under "Guard changes". None of them is deleted without a replacement assertion for the new design.

| Guard                                                                                                                                          | What it pins today                                                            | Slice                                          | Change                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/marketing/src/pages/HomePage/HomePage.test.tsx:79-90`                                                                                    | Home band order with the `hero` security band and the `contrast` closing band | M1                                             | Card and canvas only, in the new order                                                                                               |
| `apps/marketing/src/components/SecurityPrivacySection/SecurityPrivacySection.test.tsx:18`                                                      | The security strip on the `hero` band                                         | M1                                             | A card or canvas band                                                                                                                |
| `apps/marketing/src/components/ClosingCta/ClosingCta.test.tsx:22`                                                                              | The `contrast` closing band                                                   | M1                                             | A card or canvas band. `ClosingCta` is shared by Home, the five area pages and Preview, so the same PR changes the next row          |
| `apps/marketing/src/pages/FeaturePage/FeaturePage.test.tsx:139-151`                                                                            | Each area page's band list ending in `contrast`                               | M1 (with `ClosingCta`)                         | Lists end on card or canvas                                                                                                          |
| `apps/marketing/src/pages/AiConnectionPage/AiConnectionPage.test.tsx:95-105`                                                                   | The `get-started` band on `contrast`                                          | M3                                             | Card or canvas                                                                                                                       |
| `apps/marketing/src/index.css.test.ts:18-25`                                                                                                   | Focus ring colours on the `hero` and `contrast` bands                         | The slice that removes the last such band (M3) | Drop the band selectors only; the footer's focus ring rule and its assertion stay                                                    |
| `packages/ui/src/patterns/SectionBand/SectionBand.test.tsx:20`                                                                                 | The tone list including `teal`, `hero` and `contrast`                         | M5                                             | Remove the unused tones from the type and the test together                                                                          |
| Comments citing B10 in `apps/marketing/src/pages/HomePage/HomePage.styles.ts:64,104`, `HomePage.tsx:147` and `PreviewPage/PreviewPage.tsx:105` | B10 now covers the apps; marketing placement is STYLE-GUIDE 8.2               | M1, M4                                         | Cite STYLE-GUIDE 8.2                                                                                                                 |
| `apps/e2e/visual` baselines                                                                                                                    | Today's pages                                                                 | Every M slice                                  | Regenerated through the workflow's update input                                                                                      |
| `scripts/check-style-literals.ts`, `scripts/check-design-tokens.ts`                                                                            | Raw durations and colours                                                     | F2, F4, M2                                     | No change expected: timelines and three.js colours read the calm and orb tokens. A baseline raise or allow-list entry needs sign-off |
| Marketing CSP, `apps/marketing/server/security.ts`                                                                                             | No worker rule                                                                | M2                                             | No change expected; any exception is a security exception for the owner                                                              |

**Guards to add** (new, not changes): the orb-only colour check (F2); the import ban on `gsap` and `three` outside `apps/marketing`, the weight ratchet, and tests of the changeover helper, the power policy and the counting figure's final value (F4); the server HTML, no-JavaScript and reduced-motion screenshot check (M1); preview, security and not-found in the visual routes (M4, M5).
