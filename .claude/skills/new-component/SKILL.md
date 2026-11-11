---

name: new-component
description: Scaffold a colocated PascalCase component directory (tsx, styles, stories, test, barrel) following AGENTS.md laws
disable-model-invocation: true
argument-hint: <ComponentName> <target-dir>
---

Scaffold `$ARGUMENTS` (ComponentName, then the parent directory, e.g. `packages/ui/src/primitives`).

1. Read `docs/agents/component-guidelines.md` first.
2. Create `<target-dir>/<ComponentName>/` with the five files, copied from `templates/` in this skill and with `__Name__` replaced by the PascalCase name and `__name__` by its camelCase/kebab form (recipe name, test id):
   - `__Name__.tsx`, `__Name__.styles.ts`, `__Name__.stories.tsx`, `__Name__.test.tsx`, `index.ts`
3. Fix the relative `styled-system` import depth in the styles/tsx files to match the target directory (compare with `packages/ui/src/primitives/Button`).
4. Use only semantic tokens (surface/text/border/primary/status/chart), `tabular-nums` for financial values, and en-GB copy in sentence case.
5. Pair `id` and `data-testid` on tested elements.
6. For `packages/ui`, register the directory in `packages/ui/src/tokens/architecture.laws.test.ts`.
7. Run `bunx biome check --write <dir>` and the component's vitest test, and report results.
