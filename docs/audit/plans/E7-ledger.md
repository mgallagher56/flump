# E7 ledger (marketing track)

Branch claude/e7-marketing-503ce5. Draft PR. Plan: docs/superpowers/plans/2026-11-11-e7-marketing-claims.md.

## Tasks
- T1 claims register: done (docs/audit/plans/E7-claims-design.md in the PR).
- T2: already delivered before this branch (8f2a133).
- T3-T6 SecurityPage, T7-T9 Home/Footer/Header, T10 Pricing (placeholder price), T11 MCP preview, T13 style guide: done.
- T14 claims guard: done, marketing only (apps/marketing/src/claims.test.ts). Web half waits for T12.
- T12 web mirrors: out of scope.

## Deviations
- Implementers grouped by file surface (5 sonnet agents), not one per task; one sonnet whole-branch review instead of per-task reviews.
- Pricing: full page with placeholder price per DECISIONS.md, not the draft's single free card.
- Header sub-label 'Free and Pro' -> 'Plans and pricing' (missed by register).
- Footer: removed extra security links (duplicate link text to /security) and bottom 'Security & Data Policies' link.
- Ledger written here (inside worktree docs) because the shared docs path is the main checkout.

## Review findings acted on
MCP spotlight heading/summary implying personal data (A3) reworded; SecurityPage 'site and app' HTTPS narrowed to marketing site; vacuous Helmet assertion removed; tsbuildinfo not committed.

## Review findings NOT acted on (follow-ups)
- MCP page: unverified '90 day PAT / one-click revoke / audit counters' pillar, 'zero hallucinations', 'Ready to connect your AI agent?' wording (owner to confirm or drop).
- 'Your data is visible only to your account' and 'We never sell your data' / 'Zero data selling' are policy statements needing owner sign-off.
- Read-only wording alongside 'coming soon' bank connection can read as a live feed (mitigated by labels); 'Coming soon' pill inside a tick icon in SecurityPrivacySection.
- Raw rgba/hex remain in SecurityPrivacySection css(), pillar cards, Footer, Header (pre-existing); flat non-colocated legacy components.
- McpPage story has a single Default story (no explicit Light/Dark); stories/axe not run (Storybook MCP down).
- Pricing: '£0' hard-coded, toggle only swaps £X/£Y; owner may drop it or the paid card.
- claims guard does not cover 'Open Banking', '256-bit', 'bank-grade', 'GDPR' or non-src files.
