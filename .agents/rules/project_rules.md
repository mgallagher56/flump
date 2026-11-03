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
- **Selective Verification**: When making changes, prioritize running tests for the specific package or file you modified rather than testing the whole workspace (e.g., `bun vitest run apps/web/app/containers/dashboard/DashboardContainer.test.tsx`).
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

### 4. Modern Technology Paradigms

- **React Router v7 Routing**:
  - Implement routes using the new React Router v7 config-based flat routes routing schema.
  - Use loaders and actions properly to handle GET and POST/PUT/DELETE flows.
  - Return responses using the `data` helper when custom headers/status codes are needed.
- **TypeORM Queries**: Ensure all TypeORM queries are optimized. Avoid N+1 queries by pre-fetching relations using relations configurations or QueryBuilder joins.

### 5. Accessibility (A11y) & Semantics

- **Radix UI & Semantic Elements**: Never attach `onClick` handlers directly to static HTML tags like `div` or `span` for core user actions. Use `@repo/ui` component wrapper primitives (which wrap Radix UI and are keyboard-accessible by default).
- **Keyboard Fallbacks**: If custom interactive elements are absolutely necessary, you must include a corresponding key event listener (`onKeyDown`/`onKeyUp`) and appropriate `role` and `tabIndex` attributes.

### 6. Type-Safe API Client

- **No Naked Fetches**: Avoid using raw `fetch` calls with hardcoded strings. Use a type-safe API client or configuration wrapper that automatically adds Auth headers and validates response shapes.
- **Centralized Env Variables**: Retrieve configurations and service URLs from a unified config module. Do not hardcode environment fallbacks like `process.env.VITE_API_URL` inside individual route loaders or actions.

### 7. Database & Migration Safety

- **No Production Synchronization**: Never allow `synchronize: true` in production database environments. Database schema changes must be versioned via TypeORM migrations (`supabase migration` or NestJS TypeORM migrations) and verified locally before deployment.

### 8. Test-Driven Development (TDD)

- **TDD Requirement**: Prefer writing tests _before_ writing the implementation (Red-Green-Refactor). Define the expected behavior via unit or integration tests, run the tests to confirm they fail, write code to make them pass, and then refactor.
- **Test Coverage**: All new files, components, utilities, and services must have corresponding test files (`.test.ts`/`.test.tsx`).
- **Interactive Verification**: Use Vitest's watch mode (`vitest`) for instant feedback during feature development.
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

### 11. Documentation Maintenance

- **Keep Docs Current**: When introducing new features, refactoring directory structures, changing build steps, or adding integrations, you must update corresponding documentation files (such as `README.md`, architectural notes, or workspace guides) in the same PR/commit.
- **Accurate Descriptions**: Document newly introduced user features, configuration parameters, and developer guidelines to avoid documentation drift.

### 12. Storybook & Build Verification

- **Storybook Maintenance**: When creating or modifying UI components (in `packages/ui` or `apps/web`), write or update corresponding Storybook stories (`.stories.tsx`) to document all visual variants and interactive states.
- **Build Safety**: Always verify that all affected apps and packages compile and build successfully without errors before completing changes (e.g., via `bun run check-types` or building with Turborepo).
- **Runtime Startup**: Ensure that modified applications boot up and start correctly (`bun run dev`) without throwing runtime configuration or startup errors.

### 13. Setup Checklist Maintenance

- **Checklist Currency**: Whenever a new user-facing feature is added (a new page, tool, or capability), the Setup Checklist component (`app/components/dashboard/SetupChecklist.tsx`) must be updated to include a corresponding onboarding step for that feature.
- **Checklist Steps**: Each new step should have:
  - A clear action label describing what the user should do
  - A completion condition (how we detect the step is done)
  - A navigation target or dialog trigger to initiate setup
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

---

## Agent Persona & Behavior

- **Be Concise**: Keep explanations brief and get straight to the point.
- **Type Safety First**: Never compromise on TypeScript types. If a type is complex, declare it properly.
- **Biome Check**: After making code modifications, run the biome command to format and check for lint errors:

  ```bash
  bun run lint
  ```
