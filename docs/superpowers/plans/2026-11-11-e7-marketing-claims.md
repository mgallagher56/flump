# E7 marketing claims track (plan)

Source: docs/audit/plans/E7-plan-draft.md, DECISIONS.md, SEQUENCE.md (main checkout). Scope apps/marketing + docs. Draft PR; owner signs off all copy.

Applied decisions: D1-b (bank connection "coming soon", no FCA/AISP/matrix), D2 superseded (full pricing page, placeholder price `£X`, no trial/Pro claims), D3-a/D4-a (placeholder email, manual closure), D5-c (MCP preview, no npx/remote), D6 placeholders, D7-a (PII wording). No regulatory/GDPR statement drafted as fact. All placeholders live in `apps/marketing/src/utils/placeholders.ts`.

Already delivered: T2 (commit 8f2a133, SecurityPage form removed with test/story).

Work packages (sonnet implementer each, then independent sonnet review):

- A: SecurityPage T3-T6 (contact, FCA, encryption, erasure)
- B: Home sections + Footer + Header T7, T8, T9 (+ footer GDPR link)
- C: PricingPage T10
- D: MCP page + spotlight T11
- E: docs T1 (claims register) and T13 (style guide)
- T14 claims guard: marketing-only test, last.
