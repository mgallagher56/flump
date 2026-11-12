# E15 Phase 1 foundations and first Phase 2 components: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Land E15 Phase 1 tokens in `packages/ui` for direction A (Calm ledger) with B's compact density, then the first Phase 2 components (Money, KpiCard/KpiStrip, CoachCard, EmptyState, FormField).

**Architecture:** Plain-value token objects in `packages/ui/src/tokens/` wired into `panda.preset.ts` (E12-readable, no Panda-only syntax). Contrast is locked by an extended matrix test before values change. Components are colocated 5-file directories using semantic tokens only.

**Spec:** `docs/audit/plans/E15-plan-draft.md` (T1.x, T2.x), `E15-direction-pack.md`, `DECISIONS.md` (E15 round 2).

## Global constraints

- Scope: `packages/ui`, `scripts/` ratchet + baselines, docs. NOT `apps/web` routes/pages.
- Baselines in `scripts/` only shrink. Semantic tokens only, `tabular-nums` on numbers, en-GB, "Not set" for unknown values (D16).
- Fonts: keep Inter + Plus Jakarta Sans until the owner picks (D5 HOLD); one token swaps the family.
- Every new colour fg/bg pair passes AA (4.5 text, 3 UI/graphic) in both themes in `tokens.a11y.test.ts`.
- Subagents: sonnet only. Use `rtk`.

## Review focus

- Unknown/NaN/undefined/null money values render "Not set", never £0 (Money, KpiCard).
- Negative, zero and very large GBP values format en-GB with correct sign and tabular figures.
- `prefers-reduced-motion` and SSR (no `matchMedia`) hooks do not crash.
- Icon without `label` is `aria-hidden`; standalone icon requires label.
- Dark parity: every semantic colour leaf defines `_dark`.

## Batch 1 (PR 1, foundations)

- Task 1: Contrast matrix extension (88 existing pairs preserved; add chart 3:1, new keys), refined cool-ink neutrals, dark refinement, new keys `surface.scrim`, `chart.series6..8`, `chart.projection`, `chart.band`, `chart.baseline`; AGENTS.md law edit lands separately (Task 5).
- Task 2: Non-colour tokens: textStyles, lineHeights, fontWeights, letterSpacings, durations, easings, keyframes, zIndex, sizes (control heights, touch 44), elevation shadows with `_dark`, `compact` density condition, fonts single token + self-host CSS mechanism; preset wiring + `index.test.ts` asserts; foundation stories (Typography, Elevation, Motion, Density updates).
- Task 3: Motion hooks (`usePrefersReducedMotion`, `useChartAnimation`), `Icon` (Lucide) wrapper + gallery + migration note + `react-icons` ratchet rule in scripts.
- Task 4: Data-viz palette story, `charts/` helpers (`chartColor`, `formatAxisCurrency`), CVD ΔE test, `docs/design/{tokens,data-viz}.md`, guidelines doc.
- Task 5: AGENTS.md change (own commit): Law 1 per D3-C, section 2 token additions.

## Batch 2 (PR 2, components)

- Task 6: `Money`/`Num` (T2.3 subset). Task 7: `KpiCard`/`KpiStrip` refresh (empty "Not set", delta arrow+text, max 4). Task 8: `CoachCard`. Task 9: `EmptyState` polish. Task 10: `FormField`/`TextInput`.
  Each: five files, light+dark stories, play() if interactive, axe clean, registered in `architecture.laws.test.ts`.

## Gates

Per batch: independent sonnet review; then `rtk bun run lint`, `check-types`, `test`, `build`, `check:laws`, `check:auth`, storybook a11y if feasible; whole-branch review before PRs.
