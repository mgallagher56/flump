# E17 next phases: implementation plan (phases 0 to 2 and 7; 3 to 5 gated)

> **Round 4 overrides** (see [DECISIONS.md round 4](DECISIONS.md)). Where these conflict with the text below, these win:
> - OD1 A (N10 adopts the E23 picture), OD3 `/mcp` canonical, OD4 yes (N9 now), OD5 A (no transaction search in v2).
> - N16 loses the expiry and name rules to E20-N16; it keeps the checksum format, revoke-all and the manifest entry. Order: N6, E20-N16, N7, N16, N15.
> - N6 owns the limiter keying (`http.ts:75,136`). The per-user aggregate across tokens is an optional add-on.
> - N8 lands after E20-N17 (`auth/scopes.ts`) and absorbs its register facade. N15 renames the table after that.
> - N7 keeps the explicit column select (`receiptFilename`, `receiptMimeType`). E20-N15 owns `select:false` on `receiptData`.
> - N23 drops cross-user isolation and revoked-token 401 (E20-N23 owns them). It keeps audit, usage, expiry and 429.
> - E26 (tax-aware agent tools) builds on N12 plus the E25 engine and is gated by E29a. It needs the MCP DPIA signed and evals passing before friends.
> - N5 owns `packages/finance-engine/src/tax-year-verification.ts` with the fixed signature in DECISIONS round 4 addendum; E25-T8 appends `getTaxFeatureVerification`.

**Status:** draft for owner review. Planned read-only on 2026-11-12 against `origin/main` at `c3297f26`, in the worktree `/Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71`. Nothing is implemented. Paths are relative to the repo root.

**Binding inputs:**
- `docs/audit/plans/E17-plan-draft.md` sections 6 to 15.
- `docs/audit/plans/DECISIONS.md`:
  - Round 2, E17: D1-A, D3-B, D4-B, D5-A, D6-A, D7-A, D8-A, D9-A, D11-A, D13-A.
  - Round 2, conflict 5: E23's `birth_year` and required region win over E17 T1.11. Audit retention is 13 months. E19 must cover writes before phase 4.
  - Round 3: item 3 (interviews gate phase 3 onwards), item 5 (reserve the npm org, publish nothing), item 6 (eval cap of £15 a month and £2 a run, manual runs only, wait for T7.4).
- E20 D7-A and E20 plan section 10 and Phase 7 (M1 to M4, R2, Q11).
- E23 plan: section 2.1, P1-2, P1-4, P1-6, P1-7, P2-3, P2-4.

**AGENTS.md laws:**
- Law 5 (CI pre-flight) applies to every ticket.
- Laws 1, 2 and 4 apply to N18 and N20 only.
- Law 3 is not touched: no KPI strip or simulator split.
- Law 6 tiers are given per ticket. Law 7: every command uses `rtk`.

---

## 1. What has landed (evidence)

| Item | Commit | Evidence |
|---|---|---|
| PAT-only auth; OAuth JWTs rejected; dev token only by exact match | `1195e94f` | `packages/mcp/src/auth/token-verifier.ts:91-108` |
| Case-insensitive Bearer (part of T0.6) | `1195e94f` | `token-verifier.ts:79` (`/^bearer\s+(.*)$/i`) |
| `WWW-Authenticate` on 401 (part of T0.6) | `1195e94f`, `1a602141` | `packages/mcp/src/transports/http.ts:21,99,168` |
| Generic non-auth error, no `err.message` (part of T0.6, E20 Q10) | `1a602141` | `http.ts:22,103-104,171-175`. It returns 400, not the 500 the draft planned, per E20 Q10's acceptance. `http.test.ts:110` |
| `Retry-After` on the Express 429 (part of T0.6) | `1a602141` | `http.ts:77` |
| Pre-auth failed-attempt limiter per IP (E20 Q10) | `1a602141`, `1f82344a` | `packages/mcp/src/auth/failed-auth-limiter.ts`, `http.ts:56-66,97-99`. Trust-proxy hops: `apps/backend/src/config/security.config.ts:16-29` |
| Fake web token generator removed (E16 D8-A) | `bef3b851` | `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx:100-111` (returns when no handler) and the "not available yet" text (`data-testid="token-creation-unavailable"`) |
| Context pack for a new user writes no rows | `e6371b6d` | `apps/backend/src/mcp.service.spec.ts:93-` |
| Section 24 tool rejects unsupported years (part of T0.8) | `54c65e04` | `packages/mcp/src/tools/section24.tool.ts:64-79`, `section24.tool.test.ts:22-29` |
| E21: `@flump/api-contract`, including the PAT create schema (name 1 to 64 characters; expiry 7, 30, 90 or 365) | `98515faa` | `packages/api-contract/src/domains/mcp-tokens.ts:3-13`, `manifest.ts:370-424` |
| E21: shadow and enforce validation; `mcp-tokens` held back from enforcement | `32e02812`, `b594c357`, `7027b176` | `apps/backend/src/contract/contract-shadow.interceptor.ts:29-36`. The hold exists because the web card sends `expiryDays: null` (`McpConnectionCard.tsx:102,581`) |
| E21: `/v1` alias for every route, `/mcp` included | `0cd1e138`, `27e73547` | `apps/backend/src/config/v1-alias.middleware.ts:4-19` |
| E21 route-manifest coverage test (any new route must be added to the manifest) | `32e02812` | `apps/backend/test/contract/manifest-coverage.spec.ts:40-45` |
| Mortgage `term_months` and `fixed_rate_end_date` columns (feed the mortgage tool) | `86067127` | `apps/backend/src/entities/account.entity.ts:49-53`; `interestRate` at `:38` |
| Numeric transformer (E23 P1-1) | `b6755577` | decimal columns are numbers |
| Synced bank transactions no longer stored (E19 D8-A) | `DeleteSyncedTransactions1794355500000.ts` | This makes `query_transactions_and_spending` near-empty for every user |

## 2. What remains

**Phase 0**
- T0.1 (surface snapshot): not started.
- T0.2 (per-tool tests): only the Section 24 year test exists.
- T0.3 (stdio): still falls back to sample data (`stdio.ts:2,8,39-44,53`).
- T0.4 (schedule dumps): `debt-simulator.tool.ts:118-140` and `baseline.resource.ts:10-32`; every resource and tool uses `JSON.stringify(...,null,2)`.
- T0.5 (SDK registration): deprecated `server.resource` and `server.prompt` (`resources/*.ts:10,35,68`, `prompts/uk-advisor.prompts.ts:9,37,62`); version hard-coded at `server.ts:25-28`.
- T0.6: only the `Origin` allow-list is left. E20 M2 owns it.
- T0.7 (anonymisation): debt names `debt-simulator.tool.ts:104-105`, regex `financial-audit.tool.ts:249-256`, salary in the prompt `uk-advisor.prompts.ts:43-53`.
- T0.8 (tax years): `uk-tax-trap.tool.ts:39-42,69` still defaults to 2025/26; `section24.tool.ts:12-15` defaults to `"2024/25"`; `baseline.resource.ts:68-128` hard-codes 67.5% (`:77`) while the prompt says 69.5% (`uk-advisor.prompts.ts:39`); `PLAN_2` default at `financial-audit.tool.ts:149-150`.
- T0.9 (usage counting): every verify counts as a tool call (`token-verifier.ts:128-133`, `apps/backend/src/mcp.service.ts:84-87`); the limiter is keyed by user (`http.ts:75,136`).

**Phase 1:** none of it has started.
- T1.1 is owned by E23 (P1-4 and P1-7). `packages/finance-engine/src/picture/` does not exist yet.
- T1.11 is superseded by E23 P1-2: the profile has no `birth_year`, region or plan columns yet (`apps/backend/src/entities/user-profile.entity.ts`).

**Phase 2:** none of it has started.
- Scopes are stored but never enforced (`token-verifier.ts:3,135`).
- No expiry means a token never expires (`mcp.service.ts:192-195`).
- There is no audit table.
- The web card is not wired: `apps/web/app/components/budget/UserProfilePanel.tsx:883` renders `<McpConnectionCard />` with no props. It still offers "Never" (`McpConnectionCard.tsx:581`), the "Official MCP SDK v1.0" badge (`:236`) and the "sample/baseline data" line (`:230`).

**Phase 7:** none of it has started.

**Phase 6:** E21 owns all of it. E17's dependencies on E21 are listed in section 5.

---

## 3. Tickets (one PR each)

Shared rules for every ticket:
- Write the failing test first.
- Run the package test, then the four Section 5 checks: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test`, `rtk bun run build`.
- Tier: sonnet (implementer) unless stated.

### Phase 0 remainder

**E17-N1. Surface snapshot and per-tool harness (T0.1, T0.2). M.**
- **Goal:** pin today's `tools/list`, `resources/list` and `prompts/list`, plus each tool's output size. Call every tool through a real SDK client. Add a detector that lists which default values each tool leaks.
- **Files:**
  - NEW `packages/mcp/src/__tests__/surface.snapshot.test.ts` (SDK `Client` plus `InMemoryTransport` against `createFlumpMcpServer`, `server.ts:24`).
  - NEW `packages/mcp/src/testing/fake-provider.ts`, implementing `McpUserDataProvider` (`types.ts:4-28`).
  - NEW `packages/mcp/src/testing/personas.ts`, 3 minimal personas: empty user; renter with a card of unknown APR; mortgage plus ISA.
  - NEW `tools/{debt-simulator,financial-audit,life-events,mortgage-isa,uk-tax-trap}.tool.test.ts`.
  - `packages/mcp/vitest.config.ts:13`: raise the floors to the measured value minus 1.
- **Default-leak table:** asserts the known leaks, so the table shrinks as later tickets land: 45000, 5000, 15000, 19.9, 0.72, 350000, 220000, 4.5, 240, `PLAN_2`.
- **Depends on:** none.
- **Parallel-safe with:** everything; new files only.
- **Verify:** `rtk bun run --cwd packages/mcp test`, then Section 5.
- **Risk:** snapshot churn in N3 to N5. That is expected: those PRs update the snapshot deliberately.

**E17-N2. Honest stdio (T0.3). S.**
- **Goal:** no `DEFAULT_FINANCIAL_BASELINE` and no `cli_desktop_user`.
  - A missing `FLUMP_PAT` exits 1 with: "PAT rejected: create one in Flump, AI connections".
  - Any non-2xx response exits the same way.
  - Drop the `@flump/finance-engine` import from the bin path.
- **Files:**
  - `packages/mcp/src/transports/stdio.ts:1-68`: extract a `runStdio(env, fetchImpl)` for testing.
  - NEW `transports/stdio.test.ts` with a fetch stub.
- **Note:** `/mcp-tokens/context-pack` is behind `AuthGuard` (`apps/backend/src/mcp.controller.ts:80-86`), so every PAT gets 401 today. After N2 the CLI fails clearly instead of serving fake data, until the T3.2 proxy exists.
- **Depends on:** none.
- **Parallel-safe with:** all; only this file.
- **Verify:** stdio test, then Section 5.
- **Risk:** none. The package is private and unpublished.

**E17-N3. Output size and SDK registration (T0.4, T0.5). S.**
- **Goal:**
  - `COMPARE_BOTH` returns summaries only (`debt-simulator.tool.ts:118-140`).
  - `executive-snapshot` drops `monthlySchedule` (`baseline.resource.ts:10-32`).
  - All JSON output is compact: the `null, 2` sites in `resources/*.ts`, `tools/*.ts` and `financial-audit.tool.ts:177`.
  - Use `registerResource` and `registerPrompt` (`resources/*.ts`, `prompts/uk-advisor.prompts.ts:9,37,62`).
  - Add a `title` to each tool.
  - Read the server version from `package.json` via `createRequire` (`server.ts:25-28`).
- **Depends on:** N1.
- **Conflicts with:** N4 and N5 (same tool files). Run N3, then N4, then N5.
- **Verify:** the N1 size table drops and the snapshot is updated; then Section 5.
- **Risk:** low.

**E17-N4. Anonymisation fixes (T0.7). M.**
- **Goal:**
  - Debt names become generic labels when the token is anonymised (`debt-simulator.tool.ts:104-105`).
  - One shared scrub list replaces both regexes (`financial-audit.tool.ts:249-256` and `packages/finance-engine/src/ai-context-pack.ts:172`).
  - Budget `notes` are excluded when anonymised (`ai-context-pack.ts:166-180`).
  - Prompts stop embedding the salary (`uk-advisor.prompts.ts:43-53`).
- **Files:**
  - NEW `packages/finance-engine/src/anonymise.ts` plus a test.
  - `packages/finance-engine/src/index.ts` (one barrel line).
  - The tool, engine and prompt files above.
- **Depends on:** N3.
- **Conflicts with:**
  - E23 P1-4 (`index.ts` barrel, trivial).
  - E23 P2-4 rewrites `ai-context-pack.ts:180-302`. Keep N4's edit to `:166-180`.
- **Verify:** per-tool anonymisation assertions in the N1 tests, then Section 5.
- **Risk:** low.

**E17-N5. Tax years, interim `assumptions[]`, verification status (rest of T0.8, D4-B, D6-A interim). M.**
- **Goal:**
  - Tax-year enums come from `SUPPORTED_UK_TAX_YEARS`, and the default is `getCurrentUkTaxYear()` (`uk-tax-trap.tool.ts:39-42,69`; `section24.tool.ts:12-15`).
  - Remove the `uk-fiscal-guardrails` resource (`baseline.resource.ts:68-128`). N14 replaces it with `flump://tax-rules/{taxYear}`.
  - Drop the Scottish rate number from the prompt (`uk-advisor.prompts.ts:39`).
  - Student loan `plan` is required (`financial-audit.tool.ts:149-150`).
  - Every tool returns an interim `assumptions[]` listing the defaults it used:
    - `mortgage-isa.tool.ts:74-77`
    - `financial-audit.tool.ts:60-62,75-76`
    - `debt-simulator.tool.ts:101-102,154`
    - `life-events.tool.ts:145-153`
  - Tax tools return `verification: {status, detail}` and a notice in every response (D4-B).
- **Files:** the tool files above, plus:
  - NEW `packages/finance-engine/src/tax-year-verification.ts`, exporting `getTaxYearVerification(year)`. It wraps `yearVerification` (`packages/finance-engine/src/test-vectors/signoff.ts:66-75`), which is not exported today.
  - `packages/finance-engine/src/index.ts`.
- **Depends on:** N4.
- **Conflicts with:** E22 (tax-year files; N5 only reads them) and E23 P1-4 (the barrel).
- **Verify:** fake timers on 5 and 6 April; `verification.status === "unverified"` for every year that is not signed off; then Section 5.
- **Risk:** importing the vectors into the runtime bundle adds size. They are data only.

**E17-N6. Usage counted per `tools/call` (usage half of T0.9). S.**
- **Goal:**
  - Verification no longer records usage (`token-verifier.ts:128-133`).
  - After a successful verify, `http.ts` reads the JSON-RPC body (one message or a batch). It sets `lastUsedAt` on every authenticated request, adds the number of `tools/call` messages to `totalToolCalls`, and awaits the write, logging any error.
- **Files:**
  - `http.ts:68-95,131-162`.
  - `token-verifier.ts:23-26`: the adapter gains `recordRequest(tokenId, toolCalls)`.
  - `apps/backend/src/mcp.service.ts:84-87`.
- **E20 overlap:** the limiter key becomes `tokenId`, falling back to `userId` (`http.ts:75,136`). E20 R2 claims this too. If E20 R2 is ticketed, drop these two lines from N6.
- **Depends on:** none.
- **Conflicts with:** N7 (`mcp.service.ts`): land N6 first. Also E20 R2 and M2 and M3 (`http.ts`).
- **Verify:** new `http.test.ts` cases (initialize plus list gives 0 tool calls; a batch of 2 calls gives 2), then Section 5.
- **Risk:** body parsing differs between the Express path (`req.body`) and the web path (cloning the `Request`). Test both.

### Phase 1: real-data read layer and catalogue v2

**E17-N7. Split `McpService` (first part of T1.2). M.**
- **Goal:**
  - NEW `apps/backend/src/agent/mcp-token.service.ts`: the token store adapter and PAT CRUD, from `mcp.service.ts:68-87,169-255`.
  - NEW `apps/backend/src/agent/agent-data.service.ts`: `McpUserDataProvider`, from `mcp.service.ts:91-165`. It selects tax-record columns explicitly, with no `receiptData` or `receiptFilename` (today `:106-109,125`).
  - `McpService` keeps only the handler wiring and the context pack.
  - Register both in `apps/backend/src/app.module.ts:48-53`.
  - Split `mcp.service.spec.ts`.
- **Depends on:** N6.
- **Conflicts with:**
  - E20 M4 (strip `receiptData`; "whichever lands first owns it").
  - E23 P1-7 (`app.module.ts` providers; trivial).
  - E21: none. Controllers and routes are unchanged.
- **Verify:** spec with in-memory repositories; an assertion that no `receipt*` key is in the provider output; the `manifest-coverage.spec.ts` test still passes; Section 5.
- **Risk:** Nest DI cycles. Keep `FinanceService` and `UserProfileService` as plain injections.

**E17-N8. `defineFlumpTool`, envelope and error contract (T1.3). M.**
- **Goal:**
  - Zod input and output schemas, with the output schema as `outputSchema`.
  - `structuredContent` plus a compact text copy.
  - The envelope from draft section 6.5 and the error codes from 6.6, returned as `isError` results.
  - `responseFormat` concise or detailed; a size budget (characters divided by 4), with a truncation note.
  - Deterministic registration order through a registry array in `server.ts`.
  - A scope hook: `ctx.authorize?(scope)`. It does nothing until E20 M1 supplies the `TOOL_SCOPES` table.
- **Files:**
  - NEW `packages/mcp/src/define-tool.ts`, `envelope.ts`, `errors.ts`, and tests.
  - `packages/mcp/src/types.ts:30-34`: the context gains `authorize?` and `audit?`.
  - `server.ts:43-49`.
- **E20 coordination:** E20 M1 owns `packages/mcp/src/auth/scopes.ts` (`TOOL_SCOPES` with today's names). N8 only calls it.
- **Depends on:** N3.
- **Parallel-safe with:** N7.
- **Conflicts with:** E20 M1 (`server.ts`, `types.ts`). Agree which lands first. Recommendation: N8 first, with a no-op hook.
- **Verify:** unit tests for envelope validation, each error code and truncation; Section 5.
- **Risk:** SDK `outputSchema` needs zod 4 compatibility. The package is pinned to zod 4.6.6 (`package.json:38`) and the SDK resolves to 1.32.2.

**E17-N9. Read tools v2 on real account data (T1.4). M.**
- **Goal:** add `get_financial_snapshot`, `get_net_worth_history`, `list_accounts`, `get_budget_summary` and `get_debt_overview` (draft section 6.4).
  - Built on `PortfolioSnapshot` (`packages/finance-engine/src/portfolio.ts:118`) and budget entries, which are real today.
  - Profile-derived figures (take-home, surplus) return `missing[]` with an `askUser` sentence until N10.
  - An APR of null gives `aprStatus: "unknown"` plus a `missing[]` entry.
  - Short ids are stable per token: HMAC of `tokenId` and the UUID, recomputed per request, so no server state is needed.
- **Files:**
  - NEW `packages/mcp/src/tools/read/*.ts` plus tests.
  - NEW `packages/mcp/src/short-ids.ts`.
  - `server.ts` registry.
- **Old tools:** stay registered until N11.
- **Depends on:** N7, N8.
- **Conflicts with:** none outside lane A.
- **Verify:** persona golden outputs; envelope validation; no default leak; concise output at most about 1,500 tokens; Section 5.
- **Risk:** a second read model next to E23's picture. Mitigation: N9 reads only through `PortfolioSnapshot`, which E23 itself builds on (E23 2.2, net worth row), and N10 swaps the source.

**E17-N10. Adopt the E23 financial picture (T1.1 consumer, equals E23 P2-3). M.**
- **Goal:**
  - `agent-data.service.ts` calls E23's `FinancialPictureService` in-process.
  - `McpUserDataProvider` gains `getFinancialPicture(userId)` (`types.ts:4-28`).
  - E23 `Figure` statuses map to envelope `provenance` and `missing[]`.
  - Remove `userProfileToFinancialBaseline` from the MCP path (`mcp.service.ts:95-96`).
- **Depends on:** E23 P1-4, P1-7 and P1-2 (profile facts); N9.
- **Conflicts with:** E23 P2-3 (the same work; see open decision 1).
- **Verify:** E23 persona fixtures give the same values over MCP as `GET /financial-picture`; Section 5.
- **Risk:** E23's interface changes. Agree `Figure` and `FigureKey` before E23 P1-4 merges.

**E17-N11. Simulate tools v2; remove old names (T1.6). L.**
- **Goal:** add `compare_mortgage_overpay_vs_invest`, `simulate_debt_payoff` (v2), `project_net_worth` and `evaluate_student_loan_overpayment`.
  - The mortgage tool reads the mortgage account's balance, `interestRate` and `termMonths` (`account.entity.ts:38,49-53`). It returns `missing[]` when any is null. `expectedReturnPct` is required. Output is neutral: no "Invest 100%" recommendation (the `recommendation` fields in `mortgage-isa.tool.ts`).
  - The debt tool takes `includeSchedule` (`none`, `yearly` or `monthly`) with at most 24 months, at most 20 debts, and `missing[]` for unknown APRs.
  - `project_net_worth` starts from account balances; each event has an explicit cost; at most 10 events.
- **Removes:**
  - `mortgage-isa.tool.ts`, `life-events.tool.ts`, `debt-simulator.tool.ts`.
  - The cashflow and student-loan tools in `financial-audit.tool.ts:18-182`.
  - `query_transactions_and_spending` (`:185-300`), unless decision 5 says otherwise.
- **Files:** NEW `packages/mcp/src/tools/simulate/*.ts` plus tests; `server.ts`.
- **Depends on:** N8, N9. N10 is preferred, because salary and age are needed.
- **Conflicts with:** E15's mortgage pilot is apps/web only; N11 consumes engine `mortgage.ts` and does not edit it.
- **Verify:** personas and golden outputs; no default leak (the N1 table reaches zero for these tools); Section 5.
- **Risk:** E16 MERGE-2 and E4 T15a may change the engine's mortgage maths. N11 only calls engine functions.

**E17-N12. Tax tools v2 (T1.7, D4-B). M.**
- **Goal:** add `get_tax_year_position`, `simulate_salary_sacrifice_and_gift_aid` and `estimate_self_assessment`.
  - All go through the E22 resolver, with `verification` from N5 and a notice in every response.
  - Region is a required argument unless stored. When it is not stored, use the labelled England, Wales or NI assumption (E23 D-4-C).
  - The student loan plan comes from the profile once E23 P1-2 lands; until then it is reported in `missing[]`.
- **Removes:** `uk-tax-trap.tool.ts`, `section24.tool.ts` (move its test).
- **Files:** NEW `packages/mcp/src/tools/tax/*.ts` plus tests.
- **Depends on:** N5, N8. N10 is preferred.
- **Verify:** tests backed by vectors. Signed years assert values; unsigned years assert `unverified`. Then Section 5.
- **Risk:** users trusting unverified figures. The D4-B notice is mandatory in the output schema.

**E17-N13. `search_transactions` (T1.5). M. Deferred.**
- **Gate:** E16 F41 (CSV import). Synced transactions are no longer stored (`DeleteSyncedTransactions1794355500000.ts`), so this tool has almost no data today.
- **When built:**
  - Dates validated as `YYYY-MM-DD`, at most 366 days.
  - Debit and credit totals split.
  - `untrusted` wrapper, at most 80 characters.
  - Cursor in `agent-data.service.ts`, following E21's pagination convention. Do not edit `finance.service.ts:82` (E21 T6.6).

**E17-N14. Resources v2, prompts v2 and changelog (T1.8, T1.9, T1.10). M.**
- **Goal:**
  - Delete `executive-snapshot` and `baseline` (`baseline.resource.ts:10-65`).
  - NEW resources:
    - `flump://snapshot`
    - `flump://accounts/{accountId}`
    - `flump://tax-rules/{taxYear}`, from `getUkTaxYearRules` (`packages/finance-engine/src/uk-tax-year.ts:361`), carrying its verification status
    - `flump://glossary`
  - Six prompts with arguments and no embedded data (draft section 6.7).
  - NEW `packages/mcp/CHANGELOG.md` with the v1-to-v2 rename table; `schemaVersion` 2.0.
- **Files:** `packages/mcp/src/resources/*`, `packages/mcp/src/prompts/*`.
- **Depends on:** N9, N11, N12.
- **Verify:** snapshot update; Section 5.
- **Risk:** low (D13-A: keep the `flump://` paths disjoint from mobile deep links).

### Phase 2: scopes, PAT lifecycle, audit, token UI

**E17-N15. Scopes v2 rename and migration (T2.1, after E20 M1). M.**
- **Goal:**
  - Map `mcp:read:anonymized` to `read:summary`, `mcp:simulate` to `simulate`, and `mcp:read:full` to `read:identifiable`. Add `read:transactions` and the `write:*` names (unused until phase 4).
  - Default scopes `read:summary` and `simulate` (D5-A).
  - PAT create accepts an allow-listed `scopes`. Granting `read:identifiable` or `read:transactions` is rejected with an explanation until E20 A2/A3 step-up exists.
- **Files:**
  - `token-verifier.ts:3,70,100,135`.
  - E20's `packages/mcp/src/auth/scopes.ts` (rename the table).
  - `apps/backend/src/entities/mcp-token.entity.ts:20` (column default).
  - NEW `apps/backend/src/migrations/RenameMcpScopes<ts>.ts` plus an entry in `migrations.integration.spec.ts`.
  - `agent/mcp-token.service.ts` (from N7).
  - `mcp.controller.ts:49-65`.
  - `stdio.ts`.
  - `packages/api-contract/src/domains/mcp-tokens.ts:6-13`: add `scopes`. This is E21's file; coordinate.
- **Depends on:** E20 M1, N7, N8.
- **Conflicts with:** N16 (same service and controller; run N16 first), E20 A3, E21 (the contract file).
- **Verify:** a scope table test per tool; migration up and down with `REQUIRE_DB_TESTS=1 rtk bun run --cwd apps/backend test -- migrations`; Section 5.
- **Risk:** live PATs lose access if the mapping is wrong. The migration is idempotent and the verifier maps legacy names at read time for one release.

**E17-N16. PAT lifecycle (T2.2). M.**
- **Goal:**
  - Omitted expiry defaults to 90 days. `null` and 0 are rejected (`mcp.service.ts:192-195`, moved by N7).
  - The token name is trimmed and capped at 64 characters, matching the contract.
  - New format `flump_pat_<32 base62><6 checksum>`. The verifier keeps accepting the legacy 32-hex format until those tokens expire.
  - Revoke-all: `DELETE /mcp-tokens`.
- **Files:**
  - NEW `packages/mcp/src/auth/pat-format.ts` plus a test.
  - `token-verifier.ts:92`.
  - `agent/mcp-token.service.ts`.
  - `mcp.controller.ts`.
  - `packages/api-contract/src/manifest.ts:370-406`: the new route must be added, or `manifest-coverage.spec.ts` fails. This is E21's file.
- **Not here:** throttling `/mcp-tokens` belongs to E20 R1 ("token minting: 5 per hour").
- **Depends on:** N7.
- **Conflicts with:** E20 Q11, which claims the same expiry and name defaults. Dedupe: E17 owns them; see decision 2.
- **Verify:** service and controller specs; format round-trip and checksum rejection; Section 5.
- **Risk:** low.

**E17-N17. Agent audit trail (T2.3, 13-month retention). M.**
- **Goal:**
  - One row per `tools/call`: `userId`, `tokenId`, `clientName`, `toolName`, `scopesUsed`, `outcome`, `errorCode`, `latencyMs`, `responseBytes`, `argsFingerprint` (HMAC-SHA256), `createdAt`. No amounts and no free text.
  - The first-seen `clientInfo` is captured from `initialize` (stateless: stored on the token).
  - `GET /mcp-tokens/:id/activity`, cursor-paged, at most 50 rows.
  - A daily purge of rows older than 13 months.
- **Files:**
  - NEW `apps/backend/src/entities/agent-audit-event.entity.ts`.
  - NEW migration `AddAgentAuditEvents<ts>.ts`.
  - NEW `apps/backend/src/agent/agent-audit.service.ts` plus spec.
  - `apps/backend/src/config/typeorm.options.ts:3-10` (entities).
  - `mcp.controller.ts`; `manifest.ts` entry (E21's file).
  - `packages/mcp/src/define-tool.ts` (calls `ctx.audit`).
  - `http.ts` (`initialize` client capture).
  - Env `MCP_AUDIT_HMAC_KEY`, set by the owner.
- **Depends on:** N6, N7, N8.
- **Conflicts with:** E20 L1 (`SecurityEvent` logger; keep them separate), E20 R2 (`http.ts`).
- **Gap to note:** account deletion (E19 F40) does not exist yet. When it lands it must delete `mcp_tokens` and `agent_audit_events`. Add that row to E19's retention schedule.
- **Verify:** spec plus Postgres; a "no values in the row" assertion; Section 5.
- **Risk:** audit writes adding latency. Write asynchronously after the response and log failures.

**E17-N18. Real token UI (T2.4, finishes G-06). L. Laws 1, 2, 4, 5.**
- **Goal:**
  - Route loader and actions in `apps/web/app/routes/app.profile.tsx:13-26` (list; `intent=create|revoke|revokeAll`). No token reaches browser JS, following the E20 D1-C pattern.
  - `UserProfilePanel.tsx:883` passes data and handlers.
  - Remove "Never" (`McpConnectionCard.tsx:581`) and the null mapping (`:102`). Presets are 7, 30, 90 (default) and 365 days.
  - Remove the SDK badge (`:236`).
  - Reword the sample-data line (`:230`) only with owner-signed copy (N19).
  - Show scopes, expiry, last used and the activity list, using `tabular-nums` and `Intl` en-GB.
  - `ConfirmDialog` on revoke and on revoke-all.
  - Behind the `MCP_TOKENS_UI_ENABLED` flag (read in the loader) until phase 3.
  - Split the 847-line card into colocated subcomponents.
- **Files:**
  - NEW `apps/web/app/features/ai-connections/components/{TokenList,CreateTokenForm,TokenActivity}/`, all five files each. `architecture.laws.test.ts` still enforces five files for ai-connections (AGENTS.md Law 1).
  - The existing card files.
  - `app.profile.tsx`, `UserProfilePanel.tsx` (one line).
- **Follow-up for E21:** after N18 merges, drop `"mcp-tokens"` from `HELD_BACK_GROUPS` (`contract-shadow.interceptor.ts:36`).
- **Depends on:** N16, N17; N19 for the copy.
- **Conflicts with:**
  - E20 phase 1 proxy and route-action work, which may touch `app.profile.tsx`.
  - E15: no overlap with the mortgage and dashboard pilot, but D3-C will later restyle the profile page. Use `@repo/ui` primitives now.
- **Verify:**
  - `.test.tsx` per component.
  - Stories in light and dark with `play()` and zero a11y violations: `rtk bun run test:storybook` and `test:storybook:dark`.
  - Route action tests.
  - Section 5.
- **Risk:** this is a hotspot file. Keep the `UserProfilePanel.tsx` diff to one line.

**E17-N19. Consent and disclosure copy draft (T2.5). S. Haiku.**
- **Files:** NEW `docs/mcp/consent.md`, marked "unreviewed draft".
- **Content:** data categories, client, "revocation stops future access only", privacy link placeholder.
- **Depends on:** none.
- **Parallel-safe with:** all.
- The owner signs it (see owner steps).

**E17-N20. Context-pack export wired (T2.6, D11-A). S. Laws 1, 2, 4, 5.**
- **Goal:** the card's `onFetchContextPack` goes through a resource route. It is anonymised by default; turning that off needs a `ConfirmDialog`.
- **Files:**
  - NEW `apps/web/app/routes/app.profile.context-pack.ts`.
  - Card props.
- **Depends on:** N18 (same files; run it after).
- **Note:** the pack still contains engine defaults until E23 P2-4.
- **Verify:** `.test.tsx`, story `play()`, Section 5.

### Phase 7: eval harness skeleton (no paid runs)

**E17-N21. Personas, golden tasks, graders and runner skeleton (T7.1 skeleton, T7.3, T7.4 skeleton). M.**
- **Files:**
  - NEW `packages/mcp/src/evals/personas/*.ts`: 5 personas as provider rows. They switch to E23 P1-6 fixtures (`packages/finance-engine/src/picture/__fixtures__/`) when those land.
  - NEW `packages/mcp/src/evals/golden-tasks.ts`: 40 tasks covering J1 to J11, each with expected tools, required arguments, a tolerance of £1 or 0.5%, and behaviours.
  - NEW `packages/mcp/src/evals/graders.ts` plus tests that grade recorded transcripts deterministically.
  - NEW `scripts/mcp-eval/run.ts` and `run.test.ts`, picked up by `bun test ./scripts` (root `package.json` `test`).
- **Runner behaviour:**
  - With no `MCP_EVAL_API_KEY`, it does a dry run: oracle transcripts go through the graders.
  - With a key, it requires `--max-gbp` of 2 or less and stops at the cap.
  - It uses `fetch` to the Messages API on the Haiku tier, so no new dependency is added.
- **No workflow file yet.** `workflow_dispatch` arrives in T7.4, after the owner's key.
- **Depends on:** tool names from draft section 6.4 (N9, N11 and N12 make them live).
- **Conflicts with:** E23 P1-6 (personas; consume theirs, do not fork them).
- **Verify:** `rtk bun run test:scripts`, the package tests, Section 5.
- **Risk:** the golden tasks drift from the final names. The prefix A/B in T7.4 settles them.

**E17-N22. Catalogue lint (part of T7.5, no CI yml). S.**
- **Goal:** fail the test run unless every tool has `title`, a description of at most 600 characters, `outputSchema`, all four annotations, a `Gbp`/`Pct`/`Months` suffix on numeric money fields, and a deterministic order.
- **Allow-list:** v1 tools are listed until N11.
- **Files:** NEW `packages/mcp/src/__tests__/catalogue.lint.test.ts`.
- **Later:** the Inspector CLI job in `.github/workflows/ci-pipeline.yml` waits for an E11 slot.
- **Depends on:** N8.
- **Verify:** Section 5.

**E17-N23. Real-Postgres MCP end to end (T7.6). M.**
- **Goal:** create a PAT, `POST /mcp` `tools/call`, and check the audit row and usage. Also cover cross-user isolation, revoked and expired 401s, and 429.
- **Files:** NEW `apps/backend/test/mcp/mcp-http.integration.spec.ts`, gated by `REQUIRE_DB_TESTS`.
- **Depends on:** N17.
- **E20 overlap:** E20 Z1/Z2 lists a `/mcp` cross-user PAT test (E20 plan section 9). Dedupe: whichever lands second imports the first's harness.
- **Verify:** `TEST_DATABASE_URL=... REQUIRE_DB_TESTS=1 rtk bun run --cwd apps/backend test -- mcp-http`, then Section 5.

**Not ticketed:** T7.7 metrics (gated on E16 D9-A plus E19's notice) and T7.8 release checklist (phase 3).

---

## 4. Gated phases (not ticketed in detail)

| Phase | Gate |
|---|---|
| **3. Distribution (PAT era): T3.1 to T3.6** | Every one of these must hold: <br>1. The round 3 item 3 interviews are done: 3 users (P1 to P3) plus one P5 AI power user, on staging with the persona fixture, after the F01/F02 fixes. <br>2. N9, N11, N12, N15 to N18 have merged. <br>3. E20 M2 (`Origin`) and M3 (`MCP_ENABLED` kill switch) have merged. <br>4. The owner has confirmed the public `/mcp` host. <br>5. npm: per round 3 item 5, reserve only and publish nothing. T3.2 (stdio proxy) may be built, but T3.3 publishing waits for launch. <br>6. Marketing claims (T3.5) need owner sign-off and edits to `apps/marketing/src/claims.test.ts`. |
| **4. Writes (D3-B)** | Phase 2 is done. E19's DPIA, terms and "guidance not advice" copy cover agent writes (DECISIONS conflict 5). E21 request schemas are enforced for budget, accounts and tax (the tax group is held back today, `contract-shadow.interceptor.ts:36`). T7.4 paid evals are live (owner key), and T4.5 passes 100% "no write without confirm". |
| **5. OAuth 2.1 (D9-A)** | The T5.1 spike re-checks whether AuthKit supports custom scopes (the owner uses the WorkOS dashboard). Phase 3 is done. WorkOS Production and the custom domain are cut over (round 3 item 11). |
| **7. T7.4 paid runs** | The owner provides the key with the £15 a month and £2 a run caps; manual `workflow_dispatch` only until launch. |

## 5. Phase 6 (REST contract): E21 owns it; what E17 needs

No E17 tickets, to avoid overlap with E21. E17 needs these from E21, or will make these edits in E21's files with E21's agreement:
1. `scopes` added to `CreateMcpTokenRequest` (`packages/api-contract/src/domains/mcp-tokens.ts`). Needed by N15.
2. Manifest entries for `DELETE mcp-tokens` (N16) and `GET mcp-tokens/:id/activity` (N17) in `manifest.ts:370-406`.
3. After N18 merges, remove `"mcp-tokens"` from `HELD_BACK_GROUPS` (`contract-shadow.interceptor.ts:36`).
4. The pagination convention (`{items, nextCursor}`), reused by N13 and N17.
5. When E21 adds `Deprecation` and `Sunset` headers to unversioned aliases, exempt `/mcp` (decision 3).

---

## 6. OWNER STEPS (agents do not do these)

1. Review and merge every PR. Merges are the owner's.
2. Sign the consent and disclosure copy (N19) before N18 shows it. Legal wording stays marked unreviewed.
3. Set `MCP_AUDIT_HMAC_KEY` (a random 32 bytes) on Railway before N17 deploys, and `MCP_TOKENS_UI_ENABLED` when you want the token UI on.
4. Put the 13-month agent audit retention in E19's retention schedule (provisional per round 3 item 15).
5. Reserve the `flump` npm organisation with 2FA. Publish nothing (round 3 item 5).
6. At T7.4 only: create a dedicated Anthropic API workspace and key capped at £15 a month and add it as an Actions secret (round 3 item 6).
7. Run the interviews that gate phase 3 (round 3 item 3), and confirm the public backend host for `/mcp` (T3.1).
8. Sign off the tax vectors (E4). Tax tools only show `verified` after that.
9. Review E23's persona expected values, which N21 reuses.

## 7. Open decisions (not settled in DECISIONS.md)

1. **Who adopts the E23 picture for MCP?** Options: (A) E17-N10, with E23 P2-3 closed by reference; (B) E23 P2-3. **Recommendation: A**, because the tool envelope and provenance mapping live in `packages/mcp`. *Straightforward.*
2. **E17 and E20 ownership in `packages/mcp`.** **Recommendation:**
   - E20 owns `auth/scopes.ts` (M1), `Origin` (M2), the kill switch (M3), limiter keying and the per-user aggregate (R2), and the `/mcp-tokens` throttle (R1).
   - E17 owns `define-tool.ts`, usage and audit (N6, N17), and the PAT format and defaults (N16, absorbing E20 Q11).
   - `receiptData`: whichever of E17-N7 and E20 M4 lands first.

   *Straightforward.*
3. **Canonical MCP URL.** Options: `/mcp` or `/v1/mcp`. Both work today through `v1-alias.middleware.ts`. **Recommendation:** `/mcp`, because MCP versions itself through protocol versions and `schemaVersion`. Exempt it from future Sunset headers. *Straightforward.*
4. **Build read tools before E23's picture lands?** **Recommendation:** yes (N9 on `PortfolioSnapshot`, with `missing[]` for profile-derived figures, then swap in N10). Waiting would block all of phase 1 on E23 P1-4. *Straightforward.*
5. **Transaction search with synced transactions no longer stored.** Options: (A) drop it from the v2 catalogue until F41 CSV import; (B) keep it on manual transactions only. **Recommendation: A**, because fewer tools improve selection. *Straightforward.*

## 8. Lane summary (concurrency)

| Lane | Files | Order | In parallel with |
|---|---|---|---|
| **A: mcp tools** | `packages/mcp/src/{tools,resources,prompts,server.ts,types.ts,define-tool.ts,testing,__tests__}`, `finance-engine/src/{anonymise,tax-year-verification}.ts` plus the barrel | N1 → N3 → N4 → N5 → N8 → N9 → N11 → N12 → N14 → N22 | B, C, D |
| **B: backend agent** | `apps/backend/src/{mcp.*,agent/*,entities/agent-audit-event*,migrations/*}`, `packages/mcp/src/{transports/http.ts,auth/*}` | N6 → N7 → N16 → N17 → N15 (after E20 M1) → N23; N10 after E23 P1-4/P1-7 | A. N8 must precede N17 and N15 (`define-tool.ts`) |
| **C: web** | `apps/web/app/features/ai-connections/**`, `routes/app.profile*.ts(x)`, `UserProfilePanel.tsx:883` | N18 → N20, after N16, N17 and N19 | A, B (after their dependencies) |
| **D: docs, evals, stdio** | `docs/mcp/*`, `packages/mcp/src/evals/*`, `scripts/mcp-eval/*`, `transports/stdio.ts` | N19, N21 and N2 at any time | all |

**Cross-epic file hotspots:**
- `packages/mcp/src/transports/http.ts` and `server.ts`: E20 M1, M2, M3 and R2.
- `packages/api-contract/src/{domains/mcp-tokens.ts,manifest.ts}` and `apps/backend/src/contract/contract-shadow.interceptor.ts`: E21.
- `packages/finance-engine/src/index.ts`: E23 P1-4 (one-line barrel conflicts).
- `apps/backend/src/app.module.ts`: E23 P1-7 and E21 (one-line conflicts).
- `ai-context-pack.ts`: E23 P2-4.
- No overlap with E12 (`apps/mobile-companion`) or with E15's mortgage, dashboard and `packages/ui` work.

**Tickets E20's planner may also claim:** N6 (limiter key), N7 (`receiptData`), N8 (scope hook), N15 (scope rename), N16 (Q11 defaults), N23 (`/mcp` cross-user test).

