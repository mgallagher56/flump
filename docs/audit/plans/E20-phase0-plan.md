# E20 Phase 0 (Tier A) implementation plan

Scope: Q1, Q2, Q3, Q4, Q5, Q8, Q13, Q14 from E20-plan-draft.md. Q10 (MCP transport) and Q12 (WorkOS issuer pin, needs an owner-decoded token) are handled/deferred as recorded in E20-ledger.md. Tier B items (Q6, Q7, Q9, Q11, Q15, Q16) and all of Phase 1+ are out of scope.

Groups (disjoint files, run in parallel, test-first, no commits by subagents):

- A web: Q1 POST-only logout (+ form button), Q2 isFlumpHost helper + Secure + dev-only configure() + delete auth.callback duplicate, Q3 delete session.server.ts.
- B backend: Q4 main.ts (remove TCP proxy, CORS parsing/validation, helmet, body limit), Q5 password endpoints.
- C marketing/docs: Q8 marketing server, Q13 security.txt, Q14 security docs, Q10 MCP errors.
