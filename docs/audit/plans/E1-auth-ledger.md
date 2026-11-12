# SDD ledger — plan: docs/audit/plans/E1-auth-plan.md
Worktree: /Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed, branch worktree-e1-auth-fail-closed, BASE ad4cd80
Spec: docs/audit/plans/E1-auth-design.md (copied into worktree, untracked). Subagent models: sonnet or haiku only (user constraint). Local commits only, never push.

## Preflight scan
| Pair / task | What I checked | Finding |
|---|---|---|
| T1 -> T2 | T2 consumes TokenVerifier, TOKEN_VERIFIER, resolveAuthMode, WorkOsJwtVerifier, workosJwksFromUrl, workosIssuer, DevBypassVerifier | names match T1 Produces |
| T2 -> T5 | T5 passes allowDevToken "from the resolved auth mode"; T2 AuthModule only provides TOKEN_VERIFIER | CONFLICT: mode not exposed. See ruling 1 |
| T3, T4 share finance.service.ts and finance.service.spec.ts | T3 edits deleteAccount; T4 edits createTransaction | no overlap, sequential |
| T3 consumes AccountIntakeService.getAccount | plan says it throws NotFoundException when not owned | to verify in code by implementer |
| T5 vs Global Constraints | Constraint: no mock literal in packages/mcp; T5 keeps a dev-token branch needing the literal | CONFLICT. See ruling 2 |
| T6 step 5 vs T7 allow-list | grep "no output" but auth.server.ts holds the literal | CONFLICT. See ruling 3 |
| T7 step 6 | edits docs/audit/SUMMARY.md, untracked in main checkout and absent from worktree | See ruling 4 |
| T1 step 1 | needs WorkOS docs lookup | See ruling 5 |
| each task self-consistent | tests vs code vs files | T1 to T7 internally consistent |

## Rulings
Ruling: AuthModule also provides `AUTH_MODE` ("workos" | "dev") as an injectable value; McpService injects it to decide dev-token support — plan T5 needs the mode and T2 only exposed the verifier — if wrong, one extra provider to remove.
Ruling: MCP verifier gets `TokenVerifierOptions.devToken?: string` and `devUserId?: string`; the dev branch applies only when devToken is provided and matches. The backend passes DEV_BYPASS_TOKEN and DEV_USER.id only in dev mode. `mock_mcp_` prefix is dropped. Keeps the literal out of packages/mcp, honouring the Global Constraint — if wrong, a literal moves into one file and the T7 allow-list gains a line.
Ruling: T6 step 5 grep excludes apps/web/app/utils/auth.server.ts (the single allowed literal) — plan text self-contradicts — if wrong, none.
Ruling: T7 step 6 (mark findings fixed in SUMMARY.md) is skipped inside the worktree; the controller applies it in the main checkout after the branch is finished — file is untracked there.
Ruling: T1 step 1 research: implementer may use WebFetch for WorkOS docs; if it cannot, derive the JWKS URL from `getJwksUrl` in the installed @workos-inc/node and the issuer from authkit-react-router sources, and record it as unconfirmed in the report — if wrong, the issuer string needs a one-line fix before deploy.
Ruling: worktree base is origin/main ad4cd80, 4 commits ahead of audited commit 60cc5cb; only trivial src changes (typeorm v1 in 3 files). Audit line numbers may be off by a few lines — if wrong, none.

Task 1: dispatched implementer agent a59ead7b82fa91d47 (sonnet), BASE ad4cd80
Task 1: implementer done (commit 72ff594, DONE_WITH_CONCERNS: issuer unconfirmed; NODE_ENV must equal "development" for dev mode). Task reviewer a6ff96d1cd4e7fb77 (sonnet) dispatched.
Ruling: WorkOS issuer unconfirmed (api.workos.com/user_management/<clientId> vs api.workos.com/); JWKS URL confirmed. Accepted for now; must decode a real AuthKit token before rollout — if wrong, every real login 401s until a one-line fix.
Task 1: review: spec FAIL (exp not required; noSub dead) -> fix round 1/5 dispatched (resumed implementer a59ead7b82fa91d47).
Task 1: minor (deferred): NODE_ENV must equal "development" for dev mode (later tasks/dev scripts must set it; fails closed)
Task 1: minor (deferred): auth.config.spec production/api-key tests only assert toThrow(), not that message names AUTH_DEV_BYPASS / WORKOS_API_KEY
Task 1: minor (deferred): jose pinned with caret ^6.2.17 (repo pins exact versions)
Task 1: minor (deferred): whitespace-only WORKOS_CLIENT_ID counts as configured
Task 1: minor (deferred): DEV_USER returned as shared mutable object (freeze/copy)
Task 1: note: spec update for open question 1 lives in untracked docs/audit (not committed by design)
Task 1: fix round 1/5 implemented (commit 75c6737, 26 tests pass); scoped re-review dispatched.
Task 1: complete (commits ad4cd80..75c6737, review clean after 1 fix round)
Task 1: re-review: all findings addressed. Task 2: implementer dispatched (sonnet), BASE 75c6737.
Task 2: implementer done (commit fefdbb1, DONE_WITH_CONCERNS: 3 specs unloadable due to unbuilt workspace packages; controller built finance-engine/banking/mcp via turbo and confirmed full backend suite 18 files/100 tests green). Task reviewer dispatched (sonnet).
Task 2: complete (commits 75c6737..fefdbb1, review clean, 0 fix rounds)
Task 2: minor (deferred): export AuthMode type from auth.config.ts instead of inline union in auth.module.ts; process.env.WORKOS_CLIENT_ID as string cast (return clientId from mode resolution); dev-mode warning line not asserted
Task 3: implementer dispatched (sonnet), BASE fefdbb1.
Task 3: implementer done (commit a65a533, DONE, full backend suite 102 tests). Task reviewer dispatched (sonnet).
Task 3: complete (commits fefdbb1..a65a533, review clean, 0 fix rounds)
Task 3: minor (deferred): ownership checked 3x (getAccount loads details just as a guard); deleteAccount deletes (transactions, details, account) are not in a DB transaction — pre-existing, worth a later ticket
Task 4: implementer dispatched (sonnet), BASE a65a533.
Task 4: implementer done (commits 827c519, 3592395; DONE_WITH_CONCERNS). Implementer reports UNFIXED same-class hole: tax.controller.ts createTaxRecord/createBulkTaxRecords/updateTaxRecord spread body (id takeover), and createTransaction does not verify body.accountId ownership. Task reviewer dispatched.
Task 4: review: spec FAIL/Important: tax create/bulk/update id+userId takeover (tax.controller.ts ~765-795); createTransaction accepts foreign accountId -> fix round 1/5 dispatched (resumed implementer a29b676f742abaa08).
Ruling: tax-controller allow-list and createTransaction accountId check are in Task 4 scope — brief step 5 says fix unscoped handlers and epic goal says no cross-user writes — if wrong, a few extra lines in an already-touched area.
Task 4: minor (deferred): in-memory-repository.ts under src imports vitest and is compiled into dist (exclude testing/specs in build tsconfig); finance.service imports CreateTransactionDto type from controller (move DTO to own file); in-memory matcher only supports equality not In(); missing blank line in account service spec.
New-finding note for D-security record: tax-record mass assignment was found by Task 4 implementer (docs/audit is untracked in worktree; update main-checkout docs after the branch is finished).
Task 4: fix round 1/5 implemented (commit d6eb2a4, 119 tests); scoped re-review dispatched. Note for final review: implementer observed an undefined id in a TypeORM where clause matches any row — look for the same pattern elsewhere.
Task 4: re-review: all findings addressed. Task 4: complete (commits a65a533..d6eb2a4, review clean after 1 fix round)
Task 4: minor (deferred): accountId only truthiness-checked (typeof string belongs in DTO ticket); TAX_RECORD_FIELDS hand-maintained (fails closed)
For final review: connectBank / syncProviderAccounts / bank-connection body handling not audited for body-spread by Task 4; no DTO/ValidationPipe layer (D-08/B-02 deferred ticket)
Task 5: implementer dispatched (sonnet), BASE d6eb2a4. Dispatch carried rulings: devToken/devUserId options instead of allowDevToken; AuthenticationError->401; keep verifier metadata code, remove route.
Task 5: implementer done (commit 5aa338f; mcp 26 tests, backend 120 tests). Task reviewer dispatched.
Task 5: complete (commits d6eb2a4..5aa338f, review clean, 0 fix rounds)
Task 5: minor (deferred): Bearer scheme case-sensitive in MCP verifier (RFC 7235 says case-insensitive; fails closed); http.ts non-auth errors still labelled mcp_auth_error/400 and echo err.message (pre-existing); dev token compare not constant-time (dev only); route-removal comment lacks ticket id
Ruling: web isDevBypass mirrors backend strictness: true only with AUTH_DEV_BYPASS=true and NODE_ENV=development; throws for flag + production; flag ignored (false) with any other NODE_ENV — plan said NODE_ENV!==production, which would let web run a dev session while the backend rejects it — if wrong, devs must set NODE_ENV=development for web too (same as backend).
Task 6: implementer dispatched (sonnet), BASE 5aa338f. Client hook useUserProfile must not import server module: ruled no literal client-side.
Task 6: implementer done (commit 25f84b2, DONE_WITH_CONCERNS: getAuthSession moved utils.ts -> utils/auth.server.ts because utils.ts is client-imported (build failed otherwise); useUserProfile tests mock route loader token; loaders redirect to /login when session has no token). web 365 tests, tsc clean, web build ok. Task reviewer dispatched.
Task 6: complete (commits 5aa338f..25f84b2, review clean, 0 fix rounds)
Task 6: minor (deferred): loadWorkspaceSnapshot redirects a user with null token on ensureSignedIn:false routes; misplaced JSDoc in useUserProfile.ts; app._index.tsx calls authHeader before !user check; mixed helper conventions; BudgetContainer/onboarding degrade silently without token (E5 later)
Task 6: gap noted by reviewer: web production refusal for AUTH_DEV_BYPASS only fires inside getAuthSession error path, not at web boot (spec: refuse to start). Routed into Task 7 dispatch.
Ruling: Task 7 dispatch adds web boot-time refusal for AUTH_DEV_BYPASS+production in session.server.ts (reviewer found only an error-path throw); skips SUMMARY.md edit; runs biome read-only instead of the --write lint script; boot checks without a database — if wrong, web startup check or boot checks need a follow-up.
Task 7: implementer dispatched (sonnet), BASE 25f84b2.
Task 7: implementer done (commit e84af78, DONE_WITH_CONCERNS; gates: biome 3 baseline errors/126 warnings, check-types 14/14, test 13/13, build 8/8; check:auth exit 0/1 shown; web boot check test-first). Task reviewer dispatched.
Task 7: review: spec FAIL/Important: web boot guard in session.server.ts is dead code (nothing imports it); guard script swallows grep scan errors (|| true) -> fix round 1/5 dispatched (resumed implementer a9fb490b296d637da).
Task 7: minor (deferred): exclude-dir matches any depth; newline filenames; no automated test of script exit 1 (shown manually); SESSION_SECRET missing from .env.example; README silent on MCP dev token.
Task 7: fix round 1/5 implemented (commit b754a02, web 368 tests, check:auth 0/1/2 outcomes); scoped re-review dispatched.
Task 7: re-review: all findings addressed. Task 7: complete (commits 25f84b2..b754a02, review clean after 1 fix round)
Ruling: final whole-branch review dispatched on sonnet, not the most capable model — user restricted subagents to sonnet or haiku — if wrong, a deeper review on a stronger model is worth doing before merge given this is auth code.
Final review (sonnet): ready to merge WITH FIXES; no Critical; Important: unverified WorkOS issuer (authkit-react-router defaults to bare https://api.workos.com), weak diagnosability; must-fix: pin jose. Final fix wave dispatched (resumed Task 1 implementer a59ead7b82fa91d47): issuer array + WORKOS_ISSUER override, log jose code/claim, pin jose.
Final review triage FOLLOW-UP TICKETS: auth.config.spec message assertions; DEV_USER freeze; deleteAccount not in DB transaction; exclude test helpers from build tsconfig + move DTO type; accountId typeof check (DTO ticket); MCP Bearer case-insensitive; MCP http.ts non-auth errors 400/leak err.message; loadWorkspaceSnapshot null-token redirect; BudgetContainer/onboarding silent degrade (E5); check-script exclude-dir depth + automated exit-1 test; SESSION_SECRET in .env.example.
Final review extra minors (not fixed on branch): sendPasswordReset uses body.email (any user can trigger reset email to arbitrary address); UserProfilePanel.tsx:803 fabricated dev@flump.com; WorkOS tokens usually have no email claim -> request.user.email undefined, profile email null (verify at rollout); stdio CLI context-pack call gets 401 (needs ticket); mobile still sends mock token (document dev-mode-only); pre-existing seeded rows owned by user_mock/dev_user_123 become unreachable (purge); no structural test that every controller route has the guard; getAccounts/budget/tax auto-seed fake data (E2).
Final fix wave implemented (commit 10d6caa; auth 44 tests, backend 128, tsc clean); scoped re-review dispatched.
Final fix wave: re-review: all findings addressed (commit 10d6caa). Branch final HEAD 10d6caa.
