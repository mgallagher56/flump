# Project Rules for Flump

This document defines behavioral guidelines, coding standards, monorepo conventions, and optimization guidelines for all AI agents working on the Flump codebase in the Antigravity editor.

## Project Structure & Architecture

Flump is a monorepo managed with Turborepo (`turbo`) and Bun.

### Apps

- **`apps/web`**: The main finance dashboard web client built with **React Router v7** (the rebranded Remix v3 framework).
  - Uses **`remix-flat-routes`** adapter for route configuration (`apps/web/app/routes/`).
  - Styling: **Panda CSS** (`@pandacss/dev`) for styling. Avoid direct style overrides or other CSS-in-JS libraries.
  - State Management: **Jotai** for reactive state.
- **`apps/backend`**: A **NestJS** application serving the REST/GraphQL APIs.
  - ORM: **TypeORM** connecting to PostgreSQL.
  - Testing: **Vitest**.
- **`apps/marketing`**: An Express + Vite SSR React application for marketing pages.
- **`apps/mobile-companion`**: A mobile app built using **Expo / React Native**.
  - Styling: **TailwindCSS v4 / NativeWind v4**.

### Packages

- **`packages/ui`**: Shared UI component library exporting Radix-based components styled with Panda CSS recipes (`cva`).
- **`packages/common`**: Shared TypeScript utilities and helpers.
- **`packages/app-shell`**: Shared layout shell for React applications.
- **`packages/typescript-config`**: Shared tsconfig definitions.

---

## Optimization & Quality Guidelines

### 1. Development Velocity

- **Type Generation**: Run `bun run typecheck` or `bun turbo run check-types` to ensure types are generated and checked. For React Router v7 routes, always rely on the auto-generated types (`./+types/route-name`) for loaders, actions, and component props instead of manually typing them.
- **Selective Verification**: When running tests for a specific package, always scope execution with `--cwd` (e.g., `bun --cwd apps/web test ./app/containers/dashboard/DashboardContainer.test.tsx` or `bun --cwd apps/backend test`). Do not run `vitest` from the monorepo root directly against `apps/web/`, as it bypasses package-level Vite `~/` path alias resolution. Update snapshots with `-u` when modifying shared structural layouts like headers or navigation.
- **Vitest Runner**: Do not run `bun test` at the repository root, as Bun's native runner will collide with Vitest. Run test suites via `cd apps/web && bun x vitest run <path>`.
- **Workspace Dependencies**: When referencing other packages, use workspace imports (e.g., `@repo/ui`, `@repo/common`). Do not use relative paths to step outside of a package's directory.

### 2. Code Quality & Clean Architecture

- **Strict Typing**: Strict TypeScript mode is enabled. Do not use `any` unless absolutely necessary (which is rare). Make use of proper interfaces, types, generics, and return types.
- **Container-Component Pattern**: Maintain separation of concerns. Use _containers_ (in `app/containers`) to handle data fetching, state integration, and side effects. Keep _components_ (in `packages/ui` or `app/components`) as visual, reusable, and pure elements.
- **NestJS DI & Modules**: Ensure all backend components are properly encapsulated within NestJS modules. Use Dependency Injection (DI) correctly. Keep controllers slim by delegating business logic to services.
- **No Quiet Lint Failures**: Do not run `--skip-plugins` or ignore Biome lint issues. Fix issues directly rather than bypassing them.

### 3. Performance Optimizations

- **Compile-Time Styling**:
  - For **Web & Marketing**: Always use **Panda CSS** tokens, recipes (`cva`), and patterns. Avoid writing runtime style computations or inline CSS that defeats Panda CSS compile-time static analysis.
  - For **Mobile**: Always use Tailwind utility classes.
- **React 19 & React Compiler**:
  - React 19's compiler automatically handles memoization. Avoid manual wrapping with `useMemo` or `useCallback` unless specifically required (e.g., for ref comparisons or dependencies outside React render).
  - Use React 19's built-in Form Actions (`useActionState`, `useFormStatus`, `useOptimistic`) for server-client forms to avoid boilerplate loading/pending state tracking.
- **Data Loading**: Avoid "client-side fetching waterfalls". Fetch data in React Router v7 `loader` functions on the server side instead of running `useEffect` fetches on the client.
- **Atomic State (Jotai)**: Keep Jotai atoms atomic. Avoid giant store-like atoms. Instead, use small, focused atoms and derive state using read-only atoms or utility functions (`selectAtom`, `splitAtom`).
  - **DataRouter-Safe Hooks**: Hooks that only read atom state (e.g., `useFormatCurrency`) must read `useAtomValue(userProfileAtom)` directly rather than calling `useUserProfile()`, and any call to `useRouteLoaderData("root")` in shared hooks must be wrapped in a `try/catch` fallback so unit tests rendered outside a Data Router do not throw.
  - **Multi-Currency Formatting**: Never hardcode `£` or `toLocaleString("en-GB")` in UI components. Always use the `useFormatCurrency()` hook (`formatCurrency`, `formatCurrencyDecimal`, `symbol`).

### 4. Modern Technology Paradigms

- **React Router v7 Routing**:
  - Implement routes using the new React Router v7 config-based flat routes routing schema.
  - Use loaders and actions properly to handle GET and POST/PUT/DELETE flows.
  - Return responses using the `data` helper when custom headers/status codes are needed.
  - Use `useRevalidator().revalidate()` instead of `window.location.reload()` to refresh route data after modal/wizard mutations.
- **TypeORM Queries**: Ensure all TypeORM queries are optimized. Avoid N+1 queries by pre-fetching relations using relations configurations or QueryBuilder joins.

### 5. Accessibility (A11y) & Semantics

- **Radix UI & Semantic Elements**: Never attach `onClick` handlers directly to static HTML tags like `div` or `span` for core user actions. Use `@repo/ui` component wrapper primitives (which wrap Radix UI and are keyboard-accessible by default).
- **Keyboard Fallbacks**: If custom interactive elements are absolutely necessary, you must include a corresponding key event listener (`onKeyDown`/`onKeyUp`) and appropriate `role` and `tabIndex` attributes.
- **No `autoFocus` Attributes**: Do not use the `autoFocus` prop on `<input>` or other elements, as Biome enforces `lint/a11y/noAutofocus` and will block pre-commit git hooks. Use callback refs (e.g. `ref={(el) => el?.focus()}`) or Radix Dialog focus management instead.
- **Hover & Flyout Menus**: For flyout/dropdown hover triggers, do not place `onMouseEnter`/`onMouseLeave` on static `div` containers if they trigger Biome warnings; attach event listeners cleanly via `useEffect` and container `ref` with a short leave timer (~140ms) to ensure smooth diagonal mouse movement.

### 5.1 Primary Navigation & Domain Pillars

- **Navigation Scalability**: The desktop header must not exceed 5 top-level interactive items to avoid layout breaking on 1024px–1440px viewports.
- **Grouped Domain Pillars**: Keep primary high-frequency links direct (`Budget`, `Accounts`), and organize specialized tools into grouped dropdown pillars:
  - **Wealth**: Savings (`/app/savings`), Pension (`/app/pension`), Mortgage (`/app/mortgage`).
  - **Planning**: Tax (`/app/tax`).
- **Multi-platform Sync**: When adding or re-organizing tools, ensure `AUTH_DESKTOP_NAV_ROUTES` in `Header.tsx`, `MobileNavDrawer.tsx`, and `MobileBottomBar.tsx` are updated in sync, including localization keys in `en/common.json` and `es/common.json`.

### 6. Type-Safe API Client

- **No Naked Fetches**: Avoid using raw `fetch` calls with hardcoded strings. Use a type-safe API client or configuration wrapper that automatically adds Auth headers and validates response shapes.
- **Centralized Env Variables**: Retrieve configurations and service URLs from a unified config module. Do not hardcode environment fallbacks like `process.env.VITE_API_URL` inside individual route loaders or actions.

### 7. Database & Migration Safety

- **No Production Synchronization**: Never allow `synchronize: true` in production database environments. Database schema changes must be versioned via TypeORM migrations (`supabase migration` or NestJS TypeORM migrations) and verified locally before deployment.
- **PostgreSQL Decimal Coercion**: PostgreSQL `numeric` / `decimal` columns are serialized as string primitives by `pg` and TypeORM. Any API endpoint returning decimal fields (e.g., interest rates, balances, contribution targets, ownership shares) must normalize/cast them to `number` in the controller/service (`Number(val) || 0`). Frontend state hooks must also enforce defense-in-depth normalization before invoking methods like `.toFixed()`.

### 8. Test-Driven Development (TDD)

- **TDD Requirement**: Prefer writing tests _before_ writing the implementation (Red-Green-Refactor). Define the expected behavior via unit or integration tests, run the tests to confirm they fail, write code to make them pass, and then refactor.
- **Test Coverage**: All new files, components, utilities, and services must have corresponding test files (`.test.ts`/`.test.tsx`).
- **Interactive Verification**: Use Vitest's watch mode (`vitest`) for instant feedback during feature development.
- **Mock Integrity for Hooks & Atoms**: When mocking modules that export both React hooks and Jotai atoms (e.g. `~/hooks/useUserProfile`), always use `await importOriginal()` to preserve atom exports and prevent sibling test failures. Always include setter mocks (such as `setProfile: vi.fn()`) in custom hook mock returns.
- **UI Tests**: Test visual elements for correct states, accessibility roles, and user interactions utilizing React Testing Library and user-event simulation.

### 9. Modern Design Choices & Visual Taste

- **Premium Aesthetics**: Do not use generic browser styles or standard flat colors. Focus on creating high-end, visual-forward UI designs:
  - **Color Palettes**: Use cohesive HSL color tokens, rich gradients, and sleek dark modes.
  - **Glassmorphism**: Utilize backdrop filters, subtle light borders (e.g., `1px solid rgba(255,255,255,0.1)`), and smooth shadows to create depth.
  - **Typography**: Enforce clean sans-serif typography (e.g., Outfit/Inter) with clear hierarchy, weights, and leading.
- **Micro-Animations**: All interactive elements (hover, focus, active states) must have smooth CSS transitions (e.g., `transition: all 0.2s ease`).
- **UI States**: Always design and style complete layouts including hover, focus-visible, active, disabled, loading skeletons, and empty states.
- **Responsive & Dynamic Layouts**: Ensure layouts are fluid and look beautiful on all screen sizes using responsive container queries or grid layouts.
- **FLPText Responsive Typography**: `FLPTextProps.fontSize` only accepts scalar strings (`string`). To apply responsive typography (e.g. `{ base: "xs", md: "sm" }`), pass responsive font sizes via `className={css({ fontSize: { base: "xs", md: "sm" } })}` rather than directly on the `fontSize` prop.

### 10. Unified Feature Delivery & Monorepo Synchronization

- **Feature Synchronization**: When introducing a new feature, ensure all parts of the monorepo are updated in sync:
  - **Backend (`apps/backend`)**: Keep the NestJS backend up to date, adding necessary API endpoints, database entities, and validation schemas to support the new capability.
  - **Web Client (`apps/web`)**: Implement the corresponding user interface and state flows in the web application.
  - **Mobile Companion (`apps/mobile-companion`)**: Guarantee that feature parity exists on the mobile application, matching the web app's functionality.
  - **Marketing Website (`apps/marketing`)**: Update marketing pages, documentation, or landing layouts with appropriate feature descriptions, copy, or visual highlights showcasing the new capability.

### 11. Documentation Maintenance & Feature Cataloging

- **Keep Docs Current**: When introducing new features, modifying routes, refactoring directory structures, changing build steps, or adding integrations, you must update corresponding documentation files (such as `docs/pages_and_features.md`, `README.md`, architectural notes, or workspace guides) in the same PR/commit.
- **Pages & Features Catalog (`docs/pages_and_features.md`) Synchronization**:
  - Whenever a page or user-facing feature is added, modified, relocated, or deprecated/removed, the agent **MUST** update `docs/pages_and_features.md`.
  - The entry must record the exact route, component/container name, status (`Usable` vs `Stub` / `Deprecated`), and a concise bulleted list of all usable capabilities.
- **README.md Synchronization**:
  - When user-facing capabilities, financial modules, or architecture components change, the agent **MUST** update the `Features` and `Overview` sections of `README.md` to prevent documentation drift.
  - Maintain the link to `docs/pages_and_features.md` in `README.md`.
- **Accurate Descriptions**: Document newly introduced user features, configuration parameters, and developer guidelines immediately. Never defer documentation updates to a later task.

### 12. Storybook & Build Verification

- **Storybook Maintenance**: When creating or modifying UI components (in `packages/ui` or `apps/web`), write or update corresponding Storybook stories (`.stories.tsx`) to document all visual variants and interactive states.
- **Build Safety**: Always verify that all affected apps and packages compile and build successfully without errors before completing changes (e.g., via `bun run check-types` or building with Turborepo).
- **Runtime Startup**: Ensure that modified applications boot up and start correctly (`bun run dev`) without throwing runtime configuration or startup errors.

### 13. Setup Checklist Maintenance

- **Checklist Currency**: Whenever a new user-facing feature is added (a new page, tool, or capability), the Setup Checklist component (`app/components/setup/SetupChecklist.tsx`) must be updated to include a corresponding onboarding step for that feature.
- **Checklist Steps**: Each new step should have:
  - A clear action label describing what the user should do
  - A completion condition (how we detect the step is done)
  - A navigation target or dialog trigger to initiate setup
- **Avoid Auto-Seed False Positives**: Because backend endpoints (such as `GET /budget-entries`) auto-seed default rows (`isDefault: true`), completion conditions must check `setupChecklistCompletedSteps` or filter out `isDefault` records so brand-new users do not see steps pre-completed.
- **Backend Tracking**: If the new feature has setup state that should persist across sessions, add the step key to the `UserProfile.setupChecklistCompletedSteps` enum or array.

### 14. Financial Calculators & Interactive Controls

- **Inputs Over Sliders**: Prefer compact numeric input fields with clear unit adornments (`£`, `%`, `years`, `/mo`) rather than range sliders or slider cards for user adjustments.
- **Single-Row Compact Layout**: In calculator cards, scenario forms, and what-if controls, place the title/label and its input on a single horizontal row (`display: flex; justify-content: space-between; align-items: center;`) rather than stacking multi-line cards or wrapping with redundant buttons.
- **Scenario State Persistence**:
  - All interactive options (scenario what-if inputs, category toggles, account inclusion/exclusion) must persist across tab changes, route transitions, and browser refreshes using `localStorage` (or global atoms).
  - Provide immediate visual confirmation of persistence (e.g., auto-saved status indicator) and an explicit reset/clear action.
  - In unit and component tests, ensure `localStorage.clear()` is called in `beforeEach` to prevent cross-test state pollution.
- **Consistent Colored Toggle Feedback**:
  - In toggle lists where items can be kept, excluded, or selected across categories (e.g., savings pools, retained income, variable expenses), ensure consistent visual state treatment across all categories:
    - Active / kept items: matching category color theme (tinted background, colored border, status icon, kept badge, colored switch).
    - Inactive / excluded items: muted grayscale background, line-through or muted text, and neutral switch state.

### 15. Overlay & Mobile Drawer Stacking Contexts

- **CSS Containing Block Traps**: Never place `position: fixed` overlays, mobile navigation drawers, or modal backdrops inside DOM ancestors styled with `backdrop-filter`, `filter`, `perspective`, or CSS `transform`. These properties create a new containing block and viewport context that breaks full-screen positioning (`100vh`/`100dvh`).
- **Portal Requirement**: Mount all full-screen dialogs, bottom sheets, and mobile drawers directly into `document.body` or use Radix UI's `<Dialog.Portal>` / `<Drawer.Portal>` primitives to ensure proper viewport pinning.

### 16. Dashboard Widgets & Customization Architecture

- **Independent Row Heights in Grid**:
  - In 2-column dashboard grids with cards of varying heights, do **not** use `gridAutoRows: "1fr"`. Omit `gridAutoRows` so each row calculates its height naturally (`auto`) based on the items in that row.
  - Retain `alignItems: "stretch"` so side-by-side widgets in the _same row_ match each other's height cleanly without forcing preceding or subsequent rows to expand.
- **Widget Customization & Disabled Widgets Tray**:
  - In customizable dashboard interfaces with hideable widgets, always render an explicit "Disabled Widgets" section when customize mode (`editMode`) is active.
  - Each disabled widget must have an individual "Add / Enable" button.
  - When a disabled widget is re-enabled, it must be appended to the **bottom of the active widget order** (`dashboardWidgetOrder`).
- **Summary & Aggregation Widgets**:
  - **No Open Button**: Widgets that summarize data across multiple tools (e.g., Financial Health Summary) must not render an "Open →" route button in their card header.
  - **Collapsible Breakdown by Default**: Comprehensive multi-tab breakdowns inside summary cards must be collapsible and **collapsed by default** with a clean trigger button (`[ View Breakdown & Tips ▼ ]`).
  - **Settings Modal Controls**: Provide configuration options in the widget settings modal to completely hide tabbed sections or toggle collapsibility.
  - **Scoring Transparency**: Any health or financial score must provide full transparency into how points are awarded:
    - Only evaluate modules active in the user's profile (`enabledPages`).
    - Display points earned vs maximum points (`{earned} / {max} pts`).
    - Clearly document what boosts score (✓) vs what hurts score (✗).
    - Provide actionable improvement advice with deep-links to the relevant pages.

### 17. TypeScript 7 & Native Compiler Tooling

- **Native CLI Compilation**: TypeScript 7.0 is compiled with Go and does not export Node programmatic compiler APIs. Framework CLIs that depend on Node compiler internals (such as Nest CLI's `nest build`) must be bypassed in favor of native `tsc` scripts (`"build": "tsc"`, `"dev": "tsc --watch"`).
- **TypeScript 6 Compatibility Bridge**: When programmatic compiler APIs are strictly required by third-party tooling, ensure `@typescript/typescript6` is installed.
- **Modern tsconfig Flags**: Do not use legacy compiler options removed in TS 7 (`moduleResolution: node10` or bare `baseUrl`). Use `"module": "NodeNext"` and `"moduleResolution": "NodeNext"` with `"rootDir": "./src"`.

### 18. Express 5 Routing & Catch-All Middleware

- **No Bare String Wildcards**: Express 5 uses `path-to-regexp` v8, which disallows `app.use("*", ...)`.
- **Catch-All Syntax**: Catch-all fallback handlers for SSR rendering or SPA fallbacks must omit the route path argument (`app.use(async (req, res) => ...)`) or use named parameters (e.g. `app.use("{*path}", ...)`).

### 19. WorkOS AuthKit & React Router v7 Authentication

- **`DataWithResponseInit` Handling**: In React Router v7, `authkitLoader` returns a `DataWithResponseInit` object rather than a web `Response`. Unpack `response.data` or conditionally check `typeof response.json === 'function'` before attempting JSON deserialization.
- **Callback Route Alignment**: Ensure `apps/web/app/routes/callback.tsx` exists and matches `WORKOS_REDIRECT_URI=http://localhost:5173/callback`. The duplicate `auth.callback.tsx` route was removed; `/auth/callback` is no longer served.
- **No Naked Resource Route Loaders**: Callback routes must check for `?code=` query parameters and redirect to `/login` if missing to avoid `Response.json(undefined)` errors. Always include a default React export (`export default function CallbackRoute() { return null; }`).
- **Pass Request to Auth URLs**: Always pass the incoming `request` and target pathname to `getSignInUrl("/app", request)` and `getSignUpUrl("/app", request)` to ensure PKCE cookies and HTTPS/HTTP flags match the client environment.

### 20. Monorepo Package ESM & NodeNext Invariants

- **Explicit Package Type**: All internal workspace packages (such as `@repo/common`, `@repo/ui`, `@repo/app-shell`) must declare `"type": "module"` in their `package.json` to be consumable by Vite SSR without CommonJS evaluation failures.
- **Explicit File Extensions in Source**: When using `NodeNext` module resolution, relative imports in TypeScript source files must use explicit `.js` extensions (e.g. `import { foo } from "./foo.js"`).

### 21. Financial Domain Invariants (Pensions & Accounts)

- **Point-in-Time Balances vs. Flows**: `AccountDetail` records represent monthly point-in-time balances. Never sum monthly balances into an "Annual Total"; use Year-End Balance or Net Change, and divide monthly averages by the count of recorded months (`count`), not `12`.
- **Asset vs. Liability Trend Polarity**: For liability account types (`Mortgage`, `Loan`, `Credit Card`), a decreasing balance is favorable (styled in green / `success.500`) and an increasing balance is unfavorable (`destructive`), while keeping the directional arrow (`↑` / `↓`) accurate to the numeric change.
- **Current vs. Past Pension Pots**:
  - Pension accounts must distinguish between active pots (`isCurrent: true`) and legacy/past employer pots (`isCurrent: false`).
  - Past pots **must never** have direct or workplace monthly contributions (`monthlyContribution = null` / `0`). Direct regular contributions must be stripped at the API layer and excluded from total monthly inflow calculations.
  - Highlight consolidation guidance whenever users have multiple pots or past employer schemes.

### 22. Copy & Style Guide Maintenance

- **Strict British English (`en-GB`)**: All user-facing text across apps, marketing pages, components, dialogs, tools, and documentation must use British English spelling (`optimisation`, `amortisation`, `modelling`, `categorisation`, `visualising`, `enrolment`, `enquiry`, `favourite`, `analyse`).
- **Sentence Case**: Use sentence case for all headings, subheadings, buttons, tabs, badges, table headers, and form labels, except for proper nouns and recognised UK acronyms (`HMRC`, `FCA`, `PAYE`, `NI`, `ISA`, `SIPP`, `Section 24`).
- **UK Financial Terminology**: Use `AER` for savings accounts and cash ISAs, `APR`/`EAR` for borrowing and overdrafts, and official UK statutory tax definitions. Never use Americanisms such as `APY`.
- **No AI Slop or Pseudo-Engineering Jargon**: Avoid melodramatic or speculative buzzwords (`engineered for`, `zero-latency`, `air-gapped`, `cryptographic vault`, `crush your debt`, `defuse promotional cliffs`). Use grounded, pragmatic, and direct language.
- **Consult & Maintain `docs/copy-style-guide.md`**: Whenever copy, routes, or features are introduced or modified, the agent **MUST** consult `docs/copy-style-guide.md` and ensure full consistency. If new terms or domain concepts are introduced, update `docs/copy-style-guide.md` in the same commit.

### 23. Institutional-Grade Frontend Architecture & Design System Laws

- **Colocated Component Directory Law (Mandatory)**: Never create standalone, flat `.tsx` component files. Every component in `packages/ui` and `apps/web/app/features/*/components` MUST live in its own PascalCase directory with colocated files:
  - `ComponentName/ComponentName.tsx` (Component implementation)
  - `ComponentName/ComponentName.styles.ts` (Panda CSS `cva` or `sva` recipes—no inline style soup)
  - `ComponentName/ComponentName.stories.tsx` (Storybook visual states + `play()` interaction test)
  - `ComponentName/ComponentName.test.tsx` (Vitest unit test)
  - `ComponentName/index.ts` (Barrel export)
- **Zero Raw Hex/RGB or Primitive Token Leaks**: Components may NEVER use hardcoded hex values (`#141A26`) or raw primitive scale tokens (`indigo.600`, `slate.800`, `success.500`, `purple.500`, `cyan.400`). Always use the 6 canonical semantic namespaces:
  - `surface.*` (`canvas`, `card`, `sunken`, `subtle`, `overlay`, `contrast`)
  - `text.*` (`primary`, `secondary`, `muted`, `onContrast`)
  - `border.*` (`DEFAULT`, `subtle`, `strong`, `input`, `focusRing`)
  - `primary.*` (`DEFAULT`, `hover`, `subtle`, `border`, `foreground`)
  - `status.{positive|warning|danger|info|neutral}.{text|bg|border|solid}`
  - `chart.*` (`primary`, `wealth`, `debt`, `warning`, `accentPurple`, `accentCyan`, `grid`, `series1`..`series5`)
- **Tabular Numbers on All Financial Data**: Every currency value, percentage, date, table cell, and slider badge MUST apply `fontVariantNumeric: 'tabular-nums'` (`tabular-nums`) and format numbers via standard UK formatting (`Intl.NumberFormat('en-GB')` / `useFormatCurrency()`).
- **Progressive Disclosure & Layout Laws**:
  - **Single-Row KPI Strip**: Top-level page metrics must use `<KpiStrip>` (`lg:grid-cols-4` or `3`, max 4 items in a single horizontal row—never a tall 2x2 grid).
  - **2-Column Simulator Split**: Any calculator or forecaster (`/debt`, `/mortgage`, `/pension`, `/forecast`) must use `<SimulatorSplitLayout>` (`lg:col-span-5` or `4` sticky left parameter controls + `lg:col-span-7` or `8` right visual chart & outcome cards). Never stack slider parameters full-width above the chart they control.
  - **Compact Slider Inputs**: Always use `<SliderField>` (Label top-left, compact editable value pill top-right, slider below). Never render a full-width text input box below a slider.
  - **No Uncollapsed Raw Schedules**: Any table exceeding 8 rows (Amortisation schedules, 12-month ledgers, multi-year tax tables) must live inside a `<CollapsibleDrawer>` or secondary tab.
- **Definition of Done for Any UI Change**:
  1. Follows the colocated directory structure.
  2. Has a `.stories.tsx` file rendering in both Light and Dark mode with zero `@storybook/addon-a11y` violations.
  3. Interactive states are covered by a `.test.tsx` or Storybook `play()` test.
  4. `bun run check-types` and `bun run test` pass with zero errors.

---

## Coding Guidelines (Style & Lint)

### 1. Formatting and Linting (Biome)

- **Primary Tool**: Use **Biome** for all formatting, linting, and import organizing.
- **Commands**:
  - Run `bun run lint` / `bun run format` to automatically fix formatting and lint issues.
- **Rules**:
  - Use space indentation.
  - Line width limit: 100 characters.
  - Use double quotes for JS/TS strings.

### 2. Git and Commit Conventions

- **Conventional Commits**: This project uses `release-please` for automated versioning and changelog generation.
- **Commit Format**: All commit messages must follow the Conventional Commits specification:
  - `feat: <description>` (for new features)
  - `fix: <description>` (for bug fixes)
  - `chore: <description>` (for configuration, chores)
  - `refactor: <description>` (for structural code refactoring)
  - `docs: <description>` (for documentation updates)
  - `test: <description>` (for adding/updating tests)

- **Primary Branch (`main`)**: `main` is the primary branch for merging and pushing work to. Direct all commits, pull requests, Renovate updates, and `release-please` releases to `main`. Railway production services watch `apps/<service>/CHANGELOG.md` on `main` and deploy when a Release Please PR is merged.

---

## Agent Persona & Behavior

- **Be Concise**: Keep explanations brief and get straight to the point.
- **Type Safety First**: Never compromise on TypeScript types. If a type is complex, declare it properly.
- **Sync Catalog & README**: After adding, altering, or removing user-facing features or pages, always verify that `docs/pages_and_features.md` and `README.md` have been updated before concluding the task.
- **Biome Check Before Commit**: Always run `bunx biome check --write <files>` on modified files _before_ running `git commit` so `husky` / `lint-staged` never fails mid-commit or stashes partially staged files:

  ```bash
  bunx biome check --write <modified-files>
  ```

---

## Agent skills

### Issue tracker

GitHub issues via `gh` CLI (`mgallagher56/flump`). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

### Component creation & editing guidelines

5-file colocated component blueprint, canonical semantic token map, UK copy standards, and testing conventions (`id` + `data-testid` pairing, Radix tab interactions, Storybook `play()` tests). See `docs/agents/component-guidelines.md`.
