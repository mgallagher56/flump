# E11 ledger (remaining work: tests and CI gates)

Branch claude/e11-tests-ci-gates. Plan: docs/superpowers/plans/2026-11-11-e11-remaining.md.
Delivered earlier: T0, T1, T2, T3, T4, T6, T20; E5 covered most of T10-T12.
Dropped per DECISIONS D7: branch protection, code-owner rules. Out of scope: T16 (E9), T17, T18, T19.

## Tasks (this session)
- [x] T8/T9 route tests (auth.callback, callback, logout): 33 tests
- [x] T7 audit gate (high/critical block, expiring allow-list, weekly schedule); real audit: 0 high, 2 moderate, allow-list empty
- [x] T14/T15 ratchets: token baseline 121 files / 1228 violations; tabular baseline 45 files
- [x] T5/T13 coverage floors (measured-1): banking 84/69/88/85, finance-engine 89/76/93/91, mcp 29/18/34/30, ui 85/64/75/86, marketing 77/68/54/77, backend 90/74/84/91, web 82/69/70/84 (stmts/branches/funcs/lines). CI vitest job now runs test:coverage.

## Deviations
- Fixed a pre-existing main failure: RouteErrorBoundary lacked a .styles.ts (packages/ui architecture.laws test red). Added a stub styles file.
- Web coverage thresholds were flat keys (ignored); now under coverage.thresholds. Plain `bun run test` no longer enforces coverage; only `test:coverage` (CI) does.

## Review findings (independent sonnet review)
- Fixed: tabular check ignored sibling .styles.ts (false positive SliderField); now reads sibling styles.
- Not acted on: design-token scan is a regex over string literals (apostrophe in comments can hide a literal; 3-4 char "#add" matches); counts are per file so swap add/remove passes; audit ignores bun audit stderr/exit (empty/non-JSON exits 2, but `{}` on a network error would pass; unverified offline); moderate advisories not shown; weekly failure only notifies by default email; audit job also blocks unrelated PRs when a new advisory appears; mcp floors are low; callback tests duplicate (source files are duplicates too).

## Follow-ups
- evilflump.co.uk matches endsWith("flump.co.uk") in auth.callback/callback/logout (cookie Domain); pinned, not fixed.
- GET /logout signs out (logout CSRF); pinned, not fixed (E1).
- callback.tsx and auth.callback.tsx are duplicate routes.
- Local bun is 1.3.5, CI 1.4.4: audit JSON shape captured on 1.3.5.

## Round 2 (PR 382 review follow-up)
- Audit: retry once; exit 1 fails PRs only (reports on main/schedule so Railway deploys are not blocked); exit 2 (registry outage) always warns; exit 3 (bad allow-list or report shape) fails on every event.
- Route tests: real "configure never reset" assertion, afterEach unstub, fail-closed cases (loader throws/rejects, upstream error Response, signOut rejects). Pinned: upstream 4xx/5xx still gets the flump_has_session cookie (confirm intended).
- Scanner: tokenizer skips comments and JSX apostrophes; hex rule 6/8 anywhere, short hex whole-literal or in CSS-like context; href/id/htmlFor/aria-*/to= exempt. Baseline unchanged (1228).
- README: audit gate and baseline sections.
- RouteErrorBoundary.styles.ts: left as is; PR 383 supplies the real one. After 383 merges: rebase, drop my stub (and keep 383's packages/ui/turbo.json).
- mcp floor left at measured-1 (29/18/34/30): measured 30.74/19.91/35.93/31.21, no headroom to raise safely.
- Known limitations: tabular-nums marker is file-wide; `.toFixed` flagged even for non-financial numbers; tokenizer reads `//` in JSX text as a comment; template literals not parsed for `${}`.
