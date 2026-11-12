# E17 plan draft: Agent and API surface (MCP tools and REST API)

Status: **draft for owner review. Nothing implemented, no files written.** Planned by a read-only Opus planner on 2026-11-11.

**Code baseline.** `main` at `e4ff6c3`, read from the worktree `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884`, which is checked out at that commit. `packages/mcp/src` there is byte-identical to `ci-release-please-token` (`f5d05b0`) apart from `packages/mcp/vitest.config.ts`. Unless a path is shown absolute, it is relative to the repo root `/Users/marcgallagher/personal/flump`.

**AGENTS.md laws this epic touches:**
- Law 5 (CI pre-flight): every task.
- Laws 1, 2 and 4 (colocation, semantic tokens, tabular numbers, stories and tests): the web tasks T2.4, T4.4 and T5.4.
- Law 3: only through the AI connections screen layout. No KPI strip or simulator split is involved.
- Law 6 (subagent model tiers): every task carries a tier.
- Law 7 (rtk): every command in execution.

---

## 1. Summary

Flump has a real MCP server: `packages/mcp`, with 8 tools, 6 resources and 3 prompts. It has a real PAT store and endpoints in `apps/backend/src/mcp.*`. Since E1, its auth fails closed. But it is not yet something a user's own AI assistant can rely on. These findings are verified in code:

1. **Most tools do not run on the user's real numbers.**
   - `userProfileToFinancialBaseline` (`packages/finance-engine/src/profile.ts:143-241`) spreads `DEFAULT_FINANCIAL_BASELINE` (`profile.ts:13-37`): age 32, £45,000 salary, £5,000 cash, £15,000 pension, £900 housing, £1,100 other outgoings, 5%/3% pension, salary sacrifice on, tax year 2025/26.
   - The `user_profiles` entity has no columns for age, region, student loan plan, cash, pension pot, home value, mortgage balance, housing cost or outgoings (`apps/backend/src/entities/user-profile.entity.ts`). So those defaults apply to **every** user.
   - Tools add their own invented values on top: 19.9% APR, 2.5% minimum payment, a 0.72 net-pay factor, £350k property, £220k mortgage, 4.5% rate, 240 months, 39.9% overdraft rate, student loan plan defaulting to `PLAN_2`.
   - `compare_mortgage_overpay_vs_isa` and `project_wealth_scenario` ignore the accounts table, where the user's real mortgage, cash and pension balances live.
   - No output says which numbers are the user's and which are assumed. E2 removed this class of fabrication from web; the MCP surface still has it.
2. **The stdio CLI always serves sample data.** `packages/mcp/src/transports/stdio.ts:16-44` calls `GET /mcp-tokens/context-pack` with the PAT. That route is behind the WorkOS `AuthGuard`, so a PAT gets 401 (also noted in the E1 ledger). The CLI then silently falls back to `DEFAULT_FINANCIAL_BASELINE` as `cli_desktop_user`. Even with a 200, the mapping (`stdio.ts:24-29`) feeds resolved pack accounts back in as raw accounts.
3. **Output shaping is not designed for LLMs.** Every tool returns pretty-printed JSON as text, with no `outputSchema` or `structuredContent`. `simulate_debt_payoff` with `COMPARE_BOTH` (`debt-simulator.tool.ts:118-140`) and the `executive-snapshot` resource (`baseline.resource.ts:10-32`) return three full month-by-month payoff schedules (`types.ts:163`, `monthlySchedule`). Their size is unmeasured but potentially many thousands of tokens.
4. **Auth is safe but thin.**
   - PAT only (E1). 128-bit PATs, stored as SHA-256 hashes, with expiry and revocation.
   - Scopes are stored but **never enforced** (D-17).
   - The rate limit is keyed by user, not token, and lives in process memory (`transports/http.ts:43`, `rate-limiter.ts`).
   - There is no audit log. `totalToolCalls` counts every HTTP request (`mcp.service.ts:84-87`).
   - No `Origin` check, which the transport spec requires. Non-auth errors leak `err.message` with status 400 (`http.ts:63-70`).
5. **The web token UI is still fake** (G-06). It is open on `main`: `UserProfilePanel.tsx:980` renders `<McpConnectionCard />` with no props, so it mints `Math.random` tokens (`McpConnectionCard.tsx:105-117`).
6. **The REST API is not a contract yet.** It has about 40 routes, no prefix, no versioning, no OpenAPI, no runtime validation (D-08 deferred), no pagination (`GET /transactions` is unbounded, `finance.service.ts:81-90`) and no throttling. E12 has already planned `@flump/api-contract` and `@flump/api-client` with zod.

**Recommendation.** Make MCP a **read-only preview on real data** first:
- Phase 0: truth and safety fixes on the existing surface. Can start now.
- Phase 1: one provenance-carrying read model, plus a smaller job-shaped tool set.
- Phase 2: scopes, audit and the real token UI. This finishes G-06.
- Phase 3: honest distribution. Remote endpoint with a PAT header, plus an npm stdio proxy.

Then add **low-risk writes behind explicit write scopes with a server-enforced propose and confirm step** (Phase 4), then **OAuth 2.1 through WorkOS AuthKit** for claude.ai and ChatGPT (Phase 5). Phase 6 adopts the REST contract alongside E12. The evaluation harness (Phase 7) starts in Phase 0 and gates every promotion.

**Effort.** About 125 raw agent-days; about 150 to 160 with review and fix rounds. The read-only preview through Phase 3 plus core evals is about 75 raw, or about 90 with review. See section 18.

---

## 2. Goals and non-goals

**Goals**
1. A user can connect their own assistant (Claude Code, Cursor and Claude Desktop now; claude.ai and ChatGPT after OAuth) in under 5 minutes and get correct answers about **their own** data.
2. Every number an agent receives carries its provenance (user, derived, assumed or missing), units, `asOf` and tax year, plus a verification status for tax maths.
3. Least-privilege scopes that are enforced, a token lifecycle the user can see and control, an audit trail, and rate limits per token.
4. Writes only for low-risk records, each confirmed by the user through a server-enforced step. Never silent, never deletes.
5. One REST contract (zod, then OpenAPI) shared by web, the E12 mobile app and the MCP adapter, with a versioning and deprecation policy.
6. An evaluation harness that measures tool selection, task completion and numeric correctness before any marketing claim.

**Non-goals**
- In-app LLM features: Flump calling a model itself.
- Regulated financial advice. Outputs are calculations and guidance; legal review follows E7.
- Payments or money movement.
- Bank aggregation (E6).
- A public third-party developer API in this epic (decision D7).
- Re-implementing tax maths. That stays in `@flump/finance-engine` and is gated by E4 sign-off.
- Fixing the old mobile app.

---

## 3. Current state inventory and assessment

### 3.1 Architecture today

- **Remote:** `POST|GET /mcp` (`apps/backend/src/mcp.controller.ts:26-34`), with no Nest guard. Then `HttpMcpHandler` (`packages/mcp/src/transports/http.ts`) runs `TokenVerifier`: PAT only, plus a dev token when `AUTH_MODE` is dev (`mcp.service.ts:55-61`). Next comes the in-memory `McpRateLimiter`. A new `McpServer` and a stateless `StreamableHTTPServerTransport` are created per request. Tools call `McpService.getUserFinancialData` in-process: 5 queries per tool call (`mcp.service.ts:91-127`).
- **Local:** `flump-mcp` bin (`packages/mcp/package.json:6-8`, `"private": true`) runs `stdio.ts`, which uses a local data provider that falls back to sample data.
- **Token endpoints** (guarded): `GET/POST /mcp-tokens`, `DELETE /mcp-tokens/:id`, `GET /mcp-tokens/context-pack` (`mcp.controller.ts:39-86`).
- **SDK:** `@modelcontextprotocol/sdk` `^1.6.1`, resolving to 1.32.2 in `bun.lock` (1.29.0 is also installed). Its `LATEST_PROTOCOL_VERSION` is `2025-11-25`. The current spec is `2026-07-28` (`/specification/latest` redirects there). That revision removes the `initialize` handshake and sessions, adds `server/discover`, and replaces server-initiated elicitation with the multi round-trip request (MRTR) pattern. No SDK release supports it yet.

### 3.2 MCP tools (8)

"Real data?" key: **R** means real user rows. **D** means profile defaults from `DEFAULT_FINANCIAL_BASELINE`. **L** means tool-local invented literals. **S** means the sample baseline (stdio).

All 8 tools set `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true` and `openWorldHint: false`. That is correct, and the marketing claim about it is true. None has `title` or `outputSchema`, and all return pretty-printed JSON text.

| Tool (file:line) | Real data? | Schema quality | Description for LLM selection | Output size and shape | Errors, units, other issues |
|---|---|---|---|---|---|
| `evaluate_cashflow_runway_and_health` (`financial-audit.tool.ts:18-139`) | Budget entries R. Salary R or D (£45k). Cash **always D £5,000**, because the profile has no column; real cash accounts are ignored. Debts R, but APR **L 19.9%** (`:75`) and minimum **L 2.5%** (`:76`). Net pay L `*0.72` (`:60`). Housing and outgoings D 900 and 1,100 (`:56`). | Three optional `hypothetical*Gbp`; good unit suffixes | Jargon ("Adaptive Lifecycle Stage", stage enums) and no when-to-use guidance | Medium. Health score components and recommendations | No error path. Assumptions not disclosed. Overlaps E16 DEMOTE-2 (runway) |
| `evaluate_uk_student_loan` (`financial-audit.tool.ts:142-182`) | Salary R or D. Plan **silently defaults to `PLAN_2`** (`:150`). Balance must be supplied | OK | OK | Small | Thresholds come from engine tables (E4 C-08 history). Unverified until E4 sign-off |
| `query_transactions_and_spending` (`financial-audit.tool.ts:185-300`) | R, but only for bank-synced accounts (G-09). Empty over stdio (`stdio.ts:46-48`) | Dates are free strings: `new Date()` on bad input gives `Invalid Date` (`mcp.service.ts:143-149`, D-08). `limit` up to 100, no cursor | "PII-scrubbed" overstates it (M-11) | Up to 100 transactions plus rollup, pretty-printed | Rollup sums `Math.abs` of credits and debits together (`:265-270`). Descriptions are **third-party text** (injection vector). Anonymisation regex covers only 9 brands (`:247-250`) |
| `simulate_uk_tax_and_pension_sacrifice` (`uk-tax-trap.tool.ts:49-151`) | Salary R or D. Region **always E/W/NI** unless passed, because region is not stored. Student loan always `NONE`. Baseline pension 5%/3% D | `employeePensionPct` is **required with no default** (`:17-21`). `taxYear` enum covers only 2025/26 and 2026/27, though E4 supports 2020/21 to 2026/27 | Good keyword match for "£100k trap" | Medium | **Default tax year 2025/26 (`:69`) is stale: today is in 2026/27.** E4 vectors not signed off (`signedOffBy: null` in `uk-tax.vectors.ts`) |
| `compare_mortgage_overpay_vs_isa` (`mortgage-isa.tool.ts:56-154`) | **Ignores mortgage accounts.** `b.mortgageBalance` is always 0, because the profile has no column and the mapping (`profile.ts:147`) gives 0. So it answers "No active mortgage balance found" for every real user unless the agent passes the balance (`:75`, `:79-97`). Defaults L 350k, 4.5%, 240 months (`:74-77`) | OK, with `hypothetical*` names | Good | Medium | "Invest 100% of surplus in UK ISA / SIPP" reads as advice (`:91`). E16 J3 says three implementations exist |
| `calculate_self_assessment_and_section24` (`section24.tool.ts:45-140`) | Tax records R. Salary R or D | `taxYear` is a free `z.string().default("2024/25")` cast `as any` (`:6-10`, `:91`) | Good | Medium | Wrong default year. Unverified maths (E4) |
| `simulate_debt_payoff` (`debt-simulator.tool.ts:53-183`) | Accounts R. APR **L 19.9%** (`:101`), minimum L (`:102`), overdraft L 39.9% (`:154`). `customDebtsOverride` allowed | Array of up to unbounded debts, no max | Good | **`COMPARE_BOTH` dumps three full monthly schedules** (`:118-140`) | Account names from raw accounts can carry institution names. The `anonymizeInstitutions` option passed to `getUserFinancialData` is ignored by the backend provider (`mcp.service.ts:91-127`) |
| `project_wealth_scenario` (`life-events.tool.ts:61-207`) | **Almost all D:** cash 5,000, pension 15,000, age 32 (`:145-151`). ISA = cash minus 5,000, which is always 0 (`:153`). Property equity 0. Ignores accounts. Preset events are invented (£40k deposit, £850/month childcare, `:85-120`) | Enum duplicates (`REMORTGAGE_SHOCK` and `REMORTGAGE_RATE_SHOCK`) | Good | Medium (5-yearly trajectory) | Effectively sample data. Forecast maths changed under E4 C-14 |

### 3.3 Resources (6, registered with the deprecated `server.resource` API)

All six are application-driven (spec), so many clients never read them unless the user attaches them. Any data an agent needs must also be reachable through a tool.

| URI (file:line) | Data | Assessment |
|---|---|---|
| `flump://context/executive-snapshot` (`baseline.resource.ts:10-32`) | Whole `FlumpAiContextPack` | Largest payload: the full baseline including defaults, three payoff schedules, budget entries with notes, and the tax calculation. Unbounded |
| `flump://context/baseline` (`:35-65`) | Baseline, stage, health, allowances, trap | Mostly defaults (3.2). Shows `userId: "anonymous-user"` when anonymised |
| `flump://rules/uk-fiscal-guardrails` (`:68-128`) | Static hardcoded constants | Mixes tax years (NI 2025/26, student loan figures of uncertain year, Scottish bands on a taxable basis). Duplicates engine tables that E4 is fixing, so drift is guaranteed. The 67.5% Scottish marginal rate here contradicts the 69.5% in the prompt (`uk-advisor.prompts.ts:39`) |
| `flump://context/accounts` (`accounts.resource.ts:10-55`) | Net worth, totals, monthly history, accounts | **Real** (from `PortfolioSnapshot`). The best existing surface |
| `flump://context/budget` (`budget.resource.ts`) | Budget summary and entries | Real entries. `notes` free text is not scrubbed (`ai-context-pack.ts:166-180` only regex-replaces names) |
| `flump://context/tax-ledger` (`tax-ledger.resource.ts`) | Tax calculation and SA summary | Tax year from the baseline default 2025/26. Unverified maths |

### 3.4 Prompts (3, registered with the deprecated `server.prompt`)

- `uk-financial-health-audit` fetches user data and never uses it (`:15-18`).
- `escape-100k-tax-trap` **embeds the salary into prompt text** (`:52`). For most users that is the £45k default, presented as fact.
- `crush-high-apr-debt` hardcodes £100 per month and `COMPARE_BOTH`, so it triggers the biggest payload.

None takes arguments such as month or tax year.

### 3.5 Auth, transport, rate limiting, anonymisation

| Area | State | Gap |
|---|---|---|
| Verifier (`token-verifier.ts:79-147`) | PAT, plus exact dev token in dev mode. The OAuth branch throws "OAuth tokens are not enabled". Errors map to 401 | Bearer scheme is case-sensitive (`:80`, E1 follow-up). No `WWW-Authenticate` header. The `expectedAudience` default `https://mcp.flump.co.uk` (`:57`) is a placeholder host |
| Scopes | `mcp:read:anonymized`, `mcp:read:full`, `mcp:simulate` stored as a simple-array (`mcp-token.entity.ts:21`) | **Not enforced anywhere** (D-17). `POST /mcp-tokens` accepts `anonymizeInstitutions: false` with no extra confirmation |
| Token create (`mcp.service.ts:169-219`) | Random 16 bytes as hex, hash stored, raw token returned once | `body: any`, so `expiryDays` and `name` are unvalidated (D-08). `expiryDays` null means **never expires**. No checksum for secret scanning |
| Usage | `recordUsage` on every verify (`:84-87`) | Counts initialize and list calls as "tool calls". Fire-and-forget. No audit trail |
| Rate limit | 60 per minute and 300 per hour per **userId**, in memory | Not per token. Lost on deploy. The Express 429 has no `Retry-After` header (the web handler does, `http.ts:93`). Marketing says "per token" |
| Transport | Stateless per request (good, and matches the 2026 direction) | No `Origin` validation (spec MUST). Non-auth errors become 400 with `err.message` (`http.ts:63-70`) |
| Anonymisation | Institution and account names become generic labels in the context pack (`ai-context-pack.ts:120-140`) | Tools that read raw accounts bypass it (debt names). Notes and transaction descriptions only get a narrow regex. M-11 still applies |

### 3.6 Tests

- `packages/mcp`: `mcp.test.ts` checks the rate limiter, a PAT happy path, a revoked PAT, and RFC 9728 metadata; the tool and resource test is only `expect(server).toBeDefined()`. `auth/token-verifier.test.ts` (E1), `transports/http.test.ts` (401s only). Coverage floors: 29/18/34/30 (`packages/mcp/vitest.config.ts`).
- Backend: `mcp.controller.spec.ts` (4 happy paths), `mcp.service.spec.ts` (dev token wiring, new user writes nothing).

Not tested: any tool's output, anonymisation per tool, scopes, 429, the real Postgres path, and any real MCP client.

### 3.7 REST endpoints (main)

All routes below use `@UseGuards(AuthGuard)` except `GET /`, `POST|GET /mcp` (verified in the handler) and nothing else.

| Controller (file) | Routes | Notes for a product contract |
|---|---|---|
| `finance.controller.ts:100-175` | `GET accounts`, `GET account-details`, `GET accounts/:id`, `GET accounts/:id/details`, `GET portfolio-snapshot`, `POST accounts`, `PUT\|PATCH accounts/:id`, `DELETE accounts/:id`, `GET transactions?accountId`, `POST transactions`, `GET bank-connections`, `POST bank-connections`, `POST bank-connections/:id/sync\|refresh`, `DELETE bank-connections/:id` | DTOs are TypeScript interfaces. PUT and PATCH are duplicates; sync and refresh are aliases. `GET transactions` is unbounded. Decimal columns risk being strings (B-architecture). History write endpoints are missing (G-04; E12 B1 = T7.28) |
| `budget.controller.ts:201-340` | `GET budget-entries`, `POST budget-entries/seed-defaults`, `POST budget-entries/categories`, `POST budget-entries`, `PATCH budget-entries/:id`, `DELETE budget-entries/:id` | Named-field copy (good pattern). No validation of `amount` or `category` |
| `tax.controller.ts:56-140` | `GET tax-records`, `GET tax-records/:id`, `POST tax-records/bulk`, `POST tax-records`, `PATCH tax-records/:id`, `DELETE tax-records/:id` | Allow-list since E1 Task 4. Responses include `receiptData` (base64 blobs), which is heavy and must never reach MCP |
| `user-profile.controller.ts:60-100` | `GET\|PATCH user-profile`, `POST user-profile/change-password\|update-password\|send-password-reset\|reset-financial-data`, `PATCH user-profile/checklist` | Aliases. The `send-password-reset` body email issue is E12 B4. Missing fields MCP needs: date of birth or age, region, student loan plan, and mortgage rate and term. Web sends `mortgageRate` and `mortgageTermYears` (commit `3cda997`), but no backend code references them: verify |
| `mcp.controller.ts` | as in 3.1 | REST token routes share a controller with the protocol endpoint (B-16) |
| `app.controller.ts` | `GET /` | none |

Cross-cutting: no global prefix or versioning (`main.ts`). No `ValidationPipe`, no swagger, no throttler, no helmet (D-09). Errors use Nest's default shape (`{statusCode, message, error}`), while MCP uses `{error, message}`. Web maps everything to 7 `BackendError` kinds (`apps/web/app/services/backend-error.ts:1-9`). CORS falls back to localhost origins.

### 3.8 Web and marketing

- **Web:** `McpConnectionCard` is labelled preview. It says "MCP tools currently run against sample/baseline data", which is true for stdio and half-true for remote. It shows a misleading "Official MCP SDK v1.0" badge, mints mock tokens, and revoke is local only.
- **Marketing** (after E7): `McpPage.tsx` and `McpSpotlightSection.tsx` say "Preview" and "baseline sample data", and keep the 8-tool catalogue. "Rate limits ... per token" (`McpPage.tsx:216`) is inaccurate: the limit is per user. "Each token records its total tool calls" (`:229`) is inaccurate: it counts requests. `apps/marketing/src/claims.test.ts:9-34` bans `npx @flump/mcp`, `mcp.flump.co.uk`, `oauth-protected-resource`, `\bnpx\b` and "Strict PII anonymisation". Any distribution copy in E17 must edit that list with owner sign-off.

### 3.9 Defect list (input to Phase 0)

| ID | Finding | Location |
|---|---|---|
| E17-F01 | Defaults presented as user data; no provenance | `profile.ts:13-37,143-241`; all tools |
| E17-F02 | Mortgage and wealth tools ignore accounts | `mortgage-isa.tool.ts:74-77`; `life-events.tool.ts:145-153` |
| E17-F03 | stdio sample-data fallback and 401 | `stdio.ts:8-59` |
| E17-F04 | Schedule dumps | `debt-simulator.tool.ts:118-140`; `baseline.resource.ts:10-32` |
| E17-F05 | Stale and free-string tax years | `uk-tax-trap.tool.ts:40-42,69`; `section24.tool.ts:6-10` |
| E17-F06 | Scopes unenforced; per-user limiter; usage miscounted | D-17; `http.ts:43`; `mcp.service.ts:84-87` |
| E17-F07 | No `Origin` check; error leak | `http.ts:36-71` |
| E17-F08 | Anonymisation bypasses (debt names, notes, descriptions, prompt salary) | as cited |
| E17-F09 | Hardcoded fiscal constants contradict each other and the engine | `baseline.resource.ts:68-128`; `uk-advisor.prompts.ts:39` |
| E17-F10 | Deprecated SDK registration APIs; hardcoded version `1.0.0` | `server.ts:25-28`; resources and prompts |

---

## 4. Best practice from primary sources, and what it means here

- **Tool errors are results, not protocol errors.** Return `isError: true` with actionable text so the model can correct itself. Servers MUST validate inputs, enforce access control, rate limit and sanitise outputs. There SHOULD be a human in the loop who can deny tool calls. Annotations are **untrusted hints** for clients. (MCP spec 2026-07-28, Tools.) *Implication:* annotations are not a safety control; server-side confirmation is.
- **Structured output.** If an `outputSchema` is present, servers MUST return conforming `structuredContent`, and SHOULD also return the JSON as text for backwards compatibility. `tools/list` SHOULD be deterministic in order. (Tools; 2026-07-28 changelog, minor change 3.) *Implication:* add zod output schemas and compact JSON text.
- **Resources are application-driven; prompts are user-controlled** (slash commands). (Resources; Prompts.) *Implication:* resources are a convenience, never the only path to data. Prompts carry workflows such as "monthly review".
- **Authorisation.** For HTTP transports: OAuth 2.1, RFC 9728 Protected Resource Metadata (MUST), `WWW-Authenticate` with `resource_metadata` and `scope`, RFC 8707 audience binding (servers MUST validate that tokens were issued for them), no token passthrough, 401 for invalid or expired tokens, and step-up via scope challenges. Client ID Metadata Documents (CIMD) are preferred; DCR is deprecated in 2026-07-28. (Authorization; changelog, Deprecated item 4.)
- **Security best practices.** Confused deputy, token passthrough is forbidden, scope minimisation (a minimal initial scope set plus incremental elevation), stdio proxy risks. (MCP Security Best Practices.)
- **Streamable HTTP.** Servers MUST validate `Origin` and return 403 when it is invalid. In 2026-07-28: no sessions, no initialize, per-request version in `_meta`, required `Mcp-Method` and `Mcp-Name` headers, `server/discover`. Elicitation moves to MRTR. Form-mode elicitation MUST NOT request sensitive data. (Transports; Elicitation; changelog.) *Implication:* stay on 2025-11-25 through the SDK now, keep the server stateless, and do not depend on elicitation, sampling, roots, logging or SSE GET, which are deprecated or moved. Put confirmation in **server-minted handles passed as ordinary tool arguments**, the pattern SEP-2567 endorses.
- **Anthropic, "Writing effective tools for agents"** (Sep 2025):
  - Build a few workflow-shaped tools, not API wrappers.
  - Namespace them.
  - Return high-signal, human-readable fields instead of UUIDs.
  - Offer a `response_format` of concise or detailed.
  - Paginate, filter and truncate with sensible defaults; Claude Code caps tool output at 25,000 tokens by default and warns at 10,000 (Claude Code MCP docs).
  - Write actionable errors.
  - Prompt-engineer descriptions as you would brief a new hire, with unambiguous parameter names.
  - Use evaluation-driven iteration with real tasks and agentic loops.
- **Client reality.**
  - Claude Code accepts `--header "Authorization: Bearer ..."` and `headersHelper` (Claude Code MCP docs), so PAT works now.
  - claude.ai connectors support `oauth_dcr`, `oauth_cimd` and `none`. `static_headers` is a **beta for a limited set of organisations** (Claude connectors authentication docs), so consumers effectively need OAuth.
  - ChatGPT needs OAuth with CIMD, DCR or a predefined client, plus PKCE (OpenAI Apps SDK auth).
  - WorkOS AuthKit can act as the MCP authorisation server, with CIMD (off by default), DCR, resource indicators, JWKS and an RFC 9728 example (WorkOS AuthKit MCP docs). Its documented `scopes_supported` lists only OIDC scopes, so custom Flump scopes are **unverified**. WorkOS also says Connect refresh tokens currently have no automatic maximum lifetime.
- **Prompt injection.** OWASP LLM01:2025. Stored third-party text (merchant descriptions) is indirect injection. **UK GDPR:** ICO guidance on AI and data protection (DPIA, minimisation, transparency).

---

## 5. User jobs and gap analysis

| Job an agent should do | Today | Gap | Target |
|---|---|---|---|
| J1 "What is my net worth and how has it changed?" | Only the `accounts` resource has net worth and monthly history. No tool | No tool; no change explanation | `get_financial_snapshot`, `get_net_worth_history` (range, change by category) |
| J2 "Do my monthly review" | Generic audit prompt. Budget has no actuals (I-03 hidden); transactions only if bank-synced | No workflow; no balance check-in | `monthly-review` prompt using the snapshot, budget summary and `search_transactions` (if synced). Phase 4 `propose_account_balance_update` |
| J3 "Should I overpay my mortgage or invest?" | Tool ignores mortgage accounts and invents rate and term | Wrong for every real user | `compare_mortgage_overpay_vs_invest` using the mortgage account plus stored rate and term, `missing[]` when rate or term is absent, and one engine function (E16 MERGE-2) |
| J4 "Am I near the £100k trap?" | Tool exists; region and student loan not stored; stale year; unverified | No headroom answer; wrong year | `get_tax_year_position` (adjusted net income, headroom to £100k, PA lost, verification status) and `simulate_salary_sacrifice_and_gift_aid` |
| J5 "Plan my tax year" | SA tool defaults to 2024/25; no deadlines | No plan | `tax-year-plan` prompt, `get_tax_year_position`, `estimate_self_assessment` (payments on account dates) |
| J6 "Add this account, budget entry or tax record" | Read-only | No writes | Phase 4 propose and confirm tools with write scopes |
| J7 "Plan my debt payoff" | Invented APR; schedule dump | Wrong and huge | `simulate_debt_payoff` with an unknown APR as `missing[]`, schedules only on request with a range |
| J8 "Can I afford X?" | Cashflow tool, heavy on defaults | Defaults | Snapshot surplus with provenance, plus `project_net_worth` with a one-off cost |
| J9 "Explain where this number came from" | No provenance | Missing | Envelope `provenance` and `assumptions` |
| J10 "What did I spend on eating out last month?" | Real only for synced accounts; mixed rollup | Mixed signs; no pagination | `search_transactions` with debit and credit split, cursor, quarantined text |
| J11 Student loan overpay | Plan silently `PLAN_2` | Silent default | Requires plan (or a stored plan, after T1.11); balance supplied or stored |

---

## 6. Target design

### 6.1 Principles

1. **No silent defaults.** A value is user data, derived, agent-supplied (a hypothetical) or missing. Missing values produce `missing[]` with an `askUser` sentence, not a guess.
2. **One read model.** The backend builds a `FinancialPicture` once per request. MCP and REST both read domain services in-process (no REST-over-HTTP, no token passthrough).
3. **Few job-shaped tools** (about 13 read and simulate tools, plus Phase 4 write tools). Concise by default.
4. **Engine owns the maths.** Tax tools show E4 verification status per tax year.
5. **Least privilege.** Scopes are enforced at call time. Writes need a confirmation handle.

### 6.2 Target architecture

- `packages/finance-engine`: `buildFinancialPicture(input) -> { values, provenance }`. New file, no `DEFAULT_FINANCIAL_BASELINE` spread. `PortfolioSnapshot` supplies balances.
- `apps/backend`: split `McpService` (B-16) into:
  - `McpTokenService` (store port, PAT CRUD)
  - `AgentDataService` (implements `McpUserDataProvider` from the Accounts, Budget, Tax and Profile services; strips `receiptData`)
  - `AgentAuditService`
  - Phase 4: `AgentChangeService` (pending changes)
- `packages/mcp`:
  - `defineFlumpTool()` helper (zod in and out, envelope, scope check, budget, errors)
  - tools grouped by domain
  - stdio becomes a **thin proxy** to the remote `/mcp` (no finance-engine dependency, no maths drift)

### 6.3 Naming conventions

- Tools: `snake_case` `verb_object`, using verbs `get_`, `list_`, `search_`, `simulate_`, `compare_`, `estimate_`, `project_`, `propose_`, `confirm_`. No product prefix by default, because Claude Code already shows `mcp__flump__...`. **Decide by eval:** T7.4 runs A/B against a `flump_` prefix before names are frozen, as Anthropic advises measuring the prefix choice.
- Parameters: unambiguous, with unit suffixes `...Gbp`, `...Pct` (0 to 100), `...Months`, `...Years`; dates as `YYYY-MM-DD`; tax year as `"YYYY/YY"` from `SUPPORTED_UK_TAX_YEARS` (`uk-tax-year.ts:36`).
- Output fields: `...Gbp` (pounds to pence, per E4 D5-a), `...MonthlyGbp` or `...AnnualGbp` where frequency matters. Liabilities as positive `owedGbp` plus `isLiability`, documented against the E2 D7 / E4 D2 storage sign (stored negative).
- Every tool has `title`, a description of at most 600 characters stating what, when to use, when not to use, and what it needs, and stable ordering in `tools/list`.

### 6.4 Tool catalogue v2

Scopes are defined in section 8. Token budget: concise at most about 1,500 tokens, detailed at most about 6,000, hard cap 10,000, with a truncation note and cursor.

| Tool | Replaces | Inputs (zod sketch) | Output highlights | Annotations | Scope |
|---|---|---|---|---|---|
| `get_financial_snapshot` | the `accounts` resource; part of the cashflow tool | `responseFormat: enum(concise,detailed).default(concise)` | net worth, assets and liabilities by category, liquid cash, consumer debt, monthly surplus (if budget exists), `dataCompleteness` (% of fields user-provided), `missing[]` | RO, idem, closed-world | `read:summary` |
| `get_net_worth_history` | none | `fromMonth`, `toMonth` (YYYY-MM, max 60 months), `groupBy: enum(total,category)` | series plus change in £ and % and top movers by category | RO | `read:summary` |
| `list_accounts` | none | `category?: enum(cash,investment,pension,property,mortgage,consumer_debt,other)`, `responseFormat` | short ids (`acc_1...`, mapped server-side to UUIDs per token), anonymised names by default, balance, APR or `aprStatus: unknown`, monthly contribution, `lastUpdated` | RO | `read:summary` (`read:identifiable` for real names) |
| `get_budget_summary` | `budget` resource; cashflow tool | `responseFormat` | income, essentials, discretionary, surplus, runway, entries (detailed only, notes excluded unless `read:identifiable`) | RO | `read:summary` |
| `search_transactions` | `query_transactions_and_spending` | `fromDate`, `toDate` (validated, max 366 days), `category?`, `accountId?` (short id), `direction?: enum(debit,credit)`, `limit 1..100 default 25`, `cursor?` | `totals.debitGbp` and `totals.creditGbp` by category, `items[]` with `merchantText` in an `untrusted` wrapper truncated to 80 characters, `nextCursor` | RO | `read:transactions` |
| `get_tax_year_position` | `tax-ledger` resource; part of the trap tool | `taxYear?` (default `getCurrentUkTaxYear()`) | gross and adjusted net income, headroom to £100k, PA lost, marginal rate (income tax only and with NI, E4 D7-a), pension and ISA allowance used where known, `verification` | RO | `read:summary` |
| `get_debt_overview` | part of the debt tool | `responseFormat` | consumer debts with `aprStatus`, `minimumStatus: stated\|estimated`, promo cliffs; student loans listed separately | RO | `read:summary` |
| `simulate_salary_sacrifice_and_gift_aid` | `simulate_uk_tax_and_pension_sacrifice` | `taxYear?`, `extraSacrificeGbp?` or `employeePensionPct?`, `giftAidNetGbp?`, `bonusGbp?`, `region?` (required if not stored) | before and after take-home, tax and NI saved, PA reclaimed, employer NI saving, `verification` | RO | `simulate` |
| `compare_mortgage_overpay_vs_invest` | `compare_mortgage_overpay_vs_isa` | `monthlyAmountGbp`, `expectedReturnPct` (no default: agent must supply or ask), `mortgageAccountId?`, `rateAprPct?` and `remainingTermMonths?` (override or fill missing) | interest saved, months saved, invested pot, delta, LTV milestones, both options neutral (no "recommendation" field) | RO | `simulate` |
| `simulate_debt_payoff` | same name | `strategy`, `extraMonthlyGbp`, `debtOverrides?` (max 20), `includeSchedule: enum(none,yearly,monthly).default(none)`, `scheduleFromMonth?`, `scheduleMonths? <= 24` | payoff date, interest, `payoffAchievable` (E4 C-13), `missing[]` when APR is unknown | RO | `simulate` |
| `project_net_worth` | `project_wealth_scenario` | `horizonYears 1..40`, `monthlySavingsGbp`, `expectedReturnPct`, `events[]` (max 10, each with explicit cost; presets only as documented templates) | yearly or 5-yearly trajectory, milestones; uses account balances | RO | `simulate` |
| `evaluate_student_loan_overpayment` | `evaluate_uk_student_loan` | `plan` (required unless stored), `balanceGbp`, `annualSalaryGbp?` | write-off vs overpay comparison, `verification` | RO | `simulate` |
| `estimate_self_assessment` | `calculate_self_assessment_and_section24` | `taxYear` enum, hypothetical rental and self-employment overrides | SA liability, Section 24 credit, payments on account dates, `verification` | RO | `simulate` |

Phase 4 write tools:

| Tool | Behaviour | Annotations | Scope |
|---|---|---|---|
| `propose_budget_entry` | Returns a preview plus `confirmationId` | `readOnlyHint:false`, `destructiveHint:false`, `idempotentHint:true` | `write:budget` |
| `propose_account_balance_update` | Monthly balance into account details | as above | `write:accounts` |
| `propose_manual_account` | as above | as above | `write:accounts` |
| `propose_tax_record` | No receipts | as above | `write:tax` |
| `confirm_change` | Takes `confirmationId` | `readOnlyHint:false`, `destructiveHint:true`, so clients prompt | the scope of the proposed kind |
| `list_agent_changes` | Lists recent agent changes | RO | `read:summary` |

There are no delete tools.

### 6.5 Response envelope (structuredContent, validated by the zod `outputSchema`)

```json
{
  "schemaVersion": "2.0",
  "asOf": "2026-11-11T09:00:00Z",
  "currency": "GBP",
  "taxYear": "2026/27",
  "result": { "...tool specific..." },
  "provenance": { "netWorthGbp": "derived:accounts", "annualSalaryGbp": "user:profile" },
  "assumptions": [{ "field": "expectedReturnPct", "value": 5, "source": "agent_supplied" }],
  "missing": [{ "field": "mortgageRateAprPct", "why": "needed to compute interest saved", "askUser": "What interest rate is your mortgage on?" }],
  "verification": { "status": "unverified", "detail": "2026/27 tax vectors not yet signed off" },
  "notice": "Calculation from your Flump data, not financial advice.",
  "truncated": false,
  "nextCursor": null
}
```

The text content is the same JSON, compact (no indentation). Anonymised ids are stable per token, so follow-up calls work without UUIDs.

### 6.6 Error contract

- **Tool errors:** `isError: true` with text JSON `{ "error": { "code", "message", "hint", "retryable", "field"? } }`.
- **Codes:** `INVALID_ARGUMENT`, `MISSING_DATA` (lists fields and `askUser`), `NOT_FOUND`, `INSUFFICIENT_SCOPE` (names the scope and where to grant it), `UNSUPPORTED_TAX_YEAR` (lists supported years), `CALCULATION_UNVERIFIED_BLOCKED` (if D4-A), `RATE_LIMITED` (`retryAfterSeconds`), `CONFIRMATION_EXPIRED`, `CONFIRMATION_MISMATCH`, `INTERNAL` (no detail; correlation id only).
- **Protocol errors** only for unknown tool or malformed JSON-RPC.
- **HTTP:** 401 plus `WWW-Authenticate: Bearer` (with `resource_metadata` and `scope` once OAuth is on). 403 for a bad `Origin`. 429 plus `Retry-After` on both handlers.

### 6.7 Resources v2 and prompts v2

**Resources** (`registerResource`, with `audience`, `priority`, `lastModified`):
- `flump://snapshot`: same payload as the concise snapshot.
- `flump://accounts/{accountId}`: template.
- `flump://tax-rules/{taxYear}`: generated from `getUkTaxYearRules` (`uk-tax-year.ts:278`), carries verification status, and replaces `uk-fiscal-guardrails`.
- `flump://glossary`: a static explanation of UK terms (adjusted net income, PA taper, Section 24, payments on account) to help models.

Delete `executive-snapshot` and `baseline`. MCP URIs use the `flump://` scheme. That is only an identifier, but note that E12 also uses `flump://` for mobile deep links. Keep the paths disjoint (`flump://snapshot` and similar vs `flump://home` and similar), or decide on `flump-mcp://` (minor, D13).

**Prompts** (`registerPrompt`, with arguments, no user data embedded):
- `monthly-review(month?)`
- `net-worth-check(months=12)`
- `tax-year-plan(taxYear?)`
- `overpay-or-invest(monthlyAmountGbp?)`
- `debt-plan(extraMonthlyGbp?)`
- `am-i-near-the-100k-trap`

Each instructs the model to call specific tools, to show `assumptions` and `missing`, to ask the user for missing values, and to present calculations, not advice.

---

## 7. Read and write policy

| Tier | Operations | Controls | Phase |
|---|---|---|---|
| R0 | Static rules and glossary | none beyond auth | 1 |
| R1 | Summaries, accounts (anonymised), budget, tax position, debt, simulations | `read:summary`, `simulate`; default PAT | 1 to 2 |
| R2 | Transactions, real institution names, notes | `read:transactions`, `read:identifiable`. Granting needs re-authentication in web (or a recent session) and its own consent line | 2 |
| W1 | Additive, low-risk creates and updates: budget entry, monthly balance, manual account, tax record without receipt | `write:*` scope; **propose and confirm**; per-token write limit (20 per hour); audit; 24-hour "undo" in web (D3) | 4 |
| W2 | Deletes, bank connections, profile, password, reset, token management | **never** through agents | none |

**Propose and confirm**
- The propose tool validates and stores a pending change: `pending_agent_changes(id, userId, tokenId, kind, payload, argsHash, expiresAt=+10 min, status)`. It returns a human-readable preview and a single-use `confirmationId`.
- `confirm_change` checks that the token, user and argsHash match and the change has not expired, applies it through the same domain service as REST (with validation), and records the audit event. Replaying returns the same result (idempotent).
- If the client declares elicitation (2025-11-25), the server may also ask a form-mode yes/no. That is an extra signal, not a replacement.
- Option D3-B adds a web approvals inbox for every write.
- **Why:** annotations are untrusted hints; elicitation support varies across clients and moves to MRTR in 2026-07-28. A server-enforced handle works the same way in every client.

---

## 8. Auth model for agents

**Scopes v2:**
- `read:summary` (default)
- `simulate` (default)
- `read:transactions`
- `read:identifiable`
- `write:budget`
- `write:accounts`
- `write:tax`

Migration maps `mcp:read:anonymized` to `read:summary`, `mcp:simulate` to `simulate`, and `mcp:read:full` to `read:identifiable`. Enforcement is in `defineFlumpTool` at call time.

`tools/list` is **not** filtered per token. The 2026-07-28 spec makes list results not vary per connection. Calls without the scope get an `INSUFFICIENT_SCOPE` error with a link to the grant UI, or for OAuth a 403 `insufficient_scope` step-up.

**Now (PAT):**
- Expiry presets 7, 30, 90 (default) or 365 days. No "never" (D5).
- Name at most 64 characters, validated by a DTO.
- New format `flump_pat_<32 base62><6 crc>` so secret scanners can recognise it. Old tokens stay valid until they expire.
- Shown once.
- Per-token limits: 60 per minute and 300 per hour, plus a per-user aggregate of 120 per minute. Writes 20 per hour.
- `last_used_at`, first-seen client name and version (from MCP `clientInfo`), real tool-call count, revoke one, revoke all.
- An audit list per token in the web UI.
- Nest Throttler on `/mcp-tokens`.

**Later (OAuth 2.1, Phase 5):**
- WorkOS AuthKit Connect as the authorisation server: CIMD enabled, DCR for older clients, resource indicator = the canonical MCP URL, audience checked by the shared `jose` verifier (`apps/backend/src/auth/workos-jwt.verifier.ts`).
- Re-enable `/.well-known/oauth-protected-resource`. The code is kept at `token-verifier.ts:66-74`.
- Flump-side scopes come from a `agent_grants` table written on Flump's consent page, using WorkOS's custom consent and completion flow. Whether AuthKit can carry custom scopes is unverified (T5.1 spike).
- Refresh-token lifetime: Flump enforces a maximum grant age (for example 90 days) by marking grants expired, because WorkOS states no automatic maximum.
- PATs stay for developer clients.

**Audit:** `agent_audit_events(id, userId, tokenId|grantId, clientName, method, toolName, scopesUsed, outcome, errorCode, latencyMs, responseBytes, argsFingerprint = HMAC-SHA256(canonical args), changeId?, createdAt)`. No amounts or free text. Retention per D12. Deleted with the account (E12 T7.27 must include `mcp_tokens`, audit rows and pending changes).

---

## 9. Privacy and UK GDPR

- **What leaves Flump:** whatever a tool returns goes to the user's chosen client and its model provider, under that provider's terms. Flump cannot recall it. A third party sees this only at the user's direction. The controller and processor framing (Flump as discloser at the user's request vs the provider's own role) needs **legal review**. Do not state it as fact in copy (E7 D0).
- **Minimisation by default:** anonymised names, `anonymous-user`, no email, name, raw UUIDs or receipt data. Free text (notes, merchant descriptions) only with R2 scopes. Aggregate before detail. Concise responses by default.
- **Consent copy** at token creation and the OAuth consent page (owner sign-off): which data categories, which client, revocation stops future access only, and a link to the privacy policy (the E7 privacy page ticket).
- **DPIA** recommended before Phase 3 goes public (ICO AI guidance). Lawful basis recorded by the owner and legal.
- **Rights:** export includes tokens, grants and audit metadata. Deletion cascades.
- **Logs and metrics:** no argument values or amounts (section 14).
- Anonymisation must be tested per tool (F-03). The marketing wording stays "institution names are replaced with generic labels by default" until broader scrubbing is tested.

---

## 10. Safety

| Threat | Vector here | Mitigation |
|---|---|---|
| Indirect prompt injection | Merchant descriptions from banks (third-party controlled), account names from providers, user notes | Quarantine as `untrusted: { text }` fields, at most 80 characters, control characters, URLs and markdown stripped; excluded from summaries; R2 scope; no tool text ever reads as instructions; writes need confirmation, so injected text cannot write silently (OWASP LLM01) |
| Data exfiltration through other tools in the client | The client may have web fetch or email tools | Flump exposes no open-world tools. Docs warn users to keep client confirmations on. Minimised outputs |
| Tool poisoning or rug-pull | Description changes | Static descriptions, schema snapshot test (T0.1), deterministic list order, versioned releases, npm provenance |
| Over-broad scopes | Default PAT with everything | Defaults `read:summary` and `simulate`; R2 and W scopes opt-in with re-authentication |
| Confused deputy and token passthrough | stdio proxy; future OAuth | MCP calls domain services in-process. The stdio proxy sends the PAT only to the configured Flump host (allow-list: production host and localhost). OAuth tokens must have audience = MCP |
| DNS rebinding | Browser to `/mcp` | `Origin` allow-list, 403 |
| Abuse and cost | Simulation loops, large arrays | zod bounds (debts at most 20, events at most 10, horizon at most 40, strings at most 200), per-token limits, request timeout, body size limit |
| Data poisoning by agent writes | Wrong entries | Validation, previews, confirmation, audit, undo window |
| Regulated-advice drift | Wording like "Invest 100%..." (`mortgage-isa.tool.ts:91`) | Neutral outputs, `notice`, prompts frame calculations; legal review (E7) |
| Token leakage | PAT in plaintext client config | Expiry, revoke, docs prefer `headersHelper` or env vars, secret-scanning format |

---

## 11. REST API as a product surface

- **Position:** an internal, contract-first API for web, E12 mobile and the backend's MCP adapter.
- **Contract:** adopt E12's `@flump/api-contract` (zod; E12 T1.5 to T1.9) as the single source. Add request schemas, and have the backend validate with the same schemas through a global zod pipe. That closes the remainder of D-08 and B-02, and matches E12 D12-C.
- **OpenAPI:** generate OpenAPI 3.1 from the zod schemas (zod 4's JSON Schema output), commit `openapi.json`, add a CI drift check, and serve it internally. `@nestjs/swagger` with class DTOs is the alternative (D9).
- **Errors:** RFC 9457 `application/problem+json`: `{type, title, status, detail, code, kind, errors[]}`, where `kind` uses the web `BACKEND_ERROR_KINDS`, so web and mobile mapping does not change. One global exception filter.
- **Pagination:** cursor (`?limit=&cursor=`), returning `{items, nextCursor}`, on `GET /transactions` and `GET /tax-records`. Defaults 50, maximum 200.
- **Versioning:**
  - Nest URI versioning `/v1/...`.
  - The unversioned paths stay as aliases with `Deprecation` and `Sunset` headers (RFC 9745 and RFC 8594) for at least 6 months, because mobile binaries live long (E12 2.13).
  - Additive-only within a version; breaking change means `/v2`.
  - `X-Flump-Client` logging.
- **Rate limiting:** a global Nest Throttler and helmet (D-09), stricter on auth-adjacent routes.
- **Public vs internal:** internal routes are everything above. `/mcp` is the only third-party surface in this epic. Options for a public developer API are in D7.

---

## 12. Transport and distribution

| Client | Path now (PAT, Phase 3) | After OAuth (Phase 5) |
|---|---|---|
| Claude Code | `claude mcp add --transport http flump <host>/mcp --header "Authorization: Bearer flump_pat_..."` or `headersHelper` | `/mcp` OAuth sign-in (CIMD, loopback) |
| Cursor | `mcp.json` `url` plus `headers` (unverified; docs page exists, not read in detail) | OAuth if supported |
| Claude Desktop | `npx -y @flump/mcp` stdio proxy with `FLUMP_PAT` env (if D2-A) | Connectors (OAuth) |
| claude.ai web and mobile | not possible (static headers is a limited beta) | custom connector, OAuth |
| ChatGPT (developer mode, apps) | not possible | OAuth (CIMD, DCR or predefined client) |
| Generic MCP clients | HTTP plus header, or the stdio proxy | OAuth |

- **Remote:** the backend on Railway at `<public backend host>/mcp`. Not verified to be deployed publicly; confirm with the owner (T3.1). A custom MCP domain is a later decision.
- **npm (D2):** `@flump/mcp` published as a **thin stdio-to-HTTP proxy**: drop `private`, add `files`, publish with npm provenance from Actions OIDC, and add a release-please component (`release-please-config.json` has none for `packages/mcp`). Ownership of the npm `@flump` scope is **unverified**: the owner must confirm.
- Optional listing in the MCP Registry (`registry.modelcontextprotocol.io`).
- **Versioning:** server version from `package.json`. Tool schema `schemaVersion`. A breaking tool change is a major bump plus a changelog entry.
- **Spec:** target 2025-11-25 through SDK 1.32.x. Plan a dual-era upgrade when an SDK supports 2026-07-28.
- **Marketing:** only claims that are true and verified by evals. Each claims-guard row (A1, A2, A4) is lifted only with owner sign-off.

---

## 13. Evaluation harness

1. **Persona fixtures** (T7.1). Five synthetic users: empty new user; renter with a credit card of unknown APR; mortgage plus ISA; £105k earner with bonus (trap); landlord with Section 24 records. Loaded into the in-memory provider and the real test Postgres (`REQUIRE_DB_TESTS` per E11).
2. **Deterministic tests** (T7.2). Every tool against the personas: golden structured outputs, envelope schema, provenance completeness, no default leakage (assert that no `DEFAULT_FINANCIAL_BASELINE` value appears unless it is an `assumption`), anonymisation, token budget (character count divided by 4 as a proxy, plus a real tokenizer offline). Tax tools are asserted only against **signed-off** E4 vectors (`uk-tax.vectors.ts`). Unsigned vectors assert `verification.status = unverified`.
3. **Contract tests** (T6.8 and T0.1). Snapshot of `tools/list` (names, schemas, annotations, descriptions); REST against `@flump/api-contract`; route inventory.
4. **Golden tasks** (T7.3). 40 tasks drawn from J1 to J11, each with an expected tool set, required arguments, numeric tolerance (£1 or 0.5%), and expected behaviours ("asks for the mortgage rate", "does not write without confirmation", "refuses a delete").
5. **LLM tool-selection and completion evals** (T7.4). A `scripts/mcp-eval` agentic loop over the Anthropic API on a cheap tier (Haiku), optionally a second provider. Run manually or by `workflow_dispatch`, plus nightly once D10 allows. Metrics: tool-selection accuracy, argument validity, task completion, tokens per task, calls per task. Prompt-injection suite: hostile merchant descriptions must not trigger a propose or confirm.
6. **MCP Inspector CLI in CI** (T7.5, slotted by E11). Start the server in process with a fixture PAT, list tools, resources and prompts, call each tool once, fail on schema or annotation lint (description length, unit suffixes, annotations present, `outputSchema` present).
7. **Real-Postgres end to end** (T7.6). Create a PAT, call `/mcp` `tools/call`, check the audit row and token usage; cross-user isolation; revoked and expired; 429.
8. **Real-client matrix** (T7.8). A manual checklist per release: Claude Code (HTTP plus header), Claude Desktop (stdio proxy), Cursor, MCP Inspector UI; later claude.ai and ChatGPT. Record time to connect.

---

## 14. Observability (privacy-safe)

- **Server-side counters only:** `mcp_tool_called{tool, outcome, errorCode, clientName, latencyBucket}`, `mcp_token_created{scopeSet}`, `mcp_token_revoked`, `mcp_change_proposed`, `mcp_change_confirmed`, `mcp_change_declined_or_expired`, response-size buckets. These align with the E16 D9-A events `mcp_token_created` and `mcp_tool_called`.
- No arguments, amounts, free text or user ids in metrics. The audit table is per user and visible to the user.
- Correlation ids in logs; OpenTelemetry `traceparent` later (2026-07-28 minor change 2).

---

## 15. Phases and tasks

**Shared rules for every task:**
- Test first where fixing behaviour.
- `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test` and `rtk bun run build` all pass (Law 5).
- Subagent tier as listed (Law 6).
- Commands prefixed with `rtk` (Law 7).

Effort: S about 0.5 to 1 agent-day, M about 2 to 3, L about 4 to 6.

### Phase 0: truth and safety on the existing surface (can start now)

| ID | Area and files | Acceptance criteria | Effort | Deps | Tier | Tests | Laws |
|---|---|---|---|---|---|---|---|
| T0.1 | `packages/mcp/src/__tests__/surface.snapshot.test.ts` (new); fixture personas (minimal) | Snapshot of `tools/list`, `resources/list`, `prompts/list` (name, schema, annotations, description). Per-tool response size table printed for 3 fixtures. Committed baseline | S | none | sonnet | snapshot | 5 |
| T0.2 | `packages/mcp/src/tools/*.test.ts` (new), fake `McpUserDataProvider` | Each of the 8 tools called through the registered handler. Anonymisation asserted. Default-leak detector listing which defaults each tool uses. `src/tools` and `src/auth` at 80% or more lines (F-03) | M | T0.1 | sonnet | unit | 5 |
| T0.3 | `packages/mcp/src/transports/stdio.ts` | No `DEFAULT_FINANCIAL_BASELINE`, no `cli_desktop_user`. Missing `FLUMP_PAT` or a non-2xx response exits with a clear stderr message ("PAT rejected: create one in Flump, AI connections"). Interim until T3.2 | S | none | sonnet | unit with a fetch stub | 5 |
| T0.4 | `debt-simulator.tool.ts:118-140`; `baseline.resource.ts:10-32`; all `JSON.stringify(...,null,2)` | `COMPARE_BOTH` returns summaries only. `executive-snapshot` drops schedules. Compact JSON. T0.1 sizes drop | S | T0.1 | sonnet | snapshot and size | 5 |
| T0.5 | `server.ts`, `resources/*`, `prompts/*` | `registerResource` and `registerPrompt`; `title` on tools; server version from `package.json` | S | none | haiku | existing pass | 5 |
| T0.6 | `transports/http.ts`, `token-verifier.ts`, `mcp.controller.ts` | Case-insensitive Bearer. `Origin` allow-list from config (403). Non-auth errors become 500 with a generic message and correlation id. 401 includes `WWW-Authenticate: Bearer`. Express 429 sets `Retry-After` | S | none | sonnet | `http.test.ts` cases | 5 |
| T0.7 | `debt-simulator.tool.ts:85-115`; `ai-context-pack.ts:166-180`; `financial-audit.tool.ts:245-255`; `uk-advisor.prompts.ts:44-56` | Debt names anonymised; notes excluded when anonymised; one shared scrub list from the engine; the prompt stops embedding salary | M | T0.2 | sonnet | per-tool anonymisation tests | 5 |
| T0.8 | `uk-tax-trap.tool.ts:40,69`; `section24.tool.ts:6-10,91`; `baseline.resource.ts:68-128`; `uk-advisor.prompts.ts:39`; all tools | Tax year defaults to `getCurrentUkTaxYear()`; enums from `SUPPORTED_UK_TAX_YEARS`. Guardrails generated from `getUkTaxYearRules` (or removed). Single Scottish marginal-rate source. Interim `assumptions[]` array on every tool listing defaults used | M | T0.2 | sonnet | unit with fake timers around 5/6 April | 5 |
| T0.9 | `mcp.service.ts:84-87`, `http.ts` | Usage is recorded only for `tools/call` (parse the JSON-RPC method), awaited with an error log; per-token limiter key = `tokenId` (fallback `userId`) | S | none | sonnet | unit | 5 |

### Phase 1: real-data read layer and catalogue v2

| ID | Area and files | Acceptance criteria | Effort | Deps | Tier | Tests | Laws |
|---|---|---|---|---|---|---|---|
| T1.1 | `packages/finance-engine/src/financial-picture.ts` (new), `index.ts` | `buildFinancialPicture` returns values plus provenance; no default spread; balances from `PortfolioSnapshot`; mortgage from mortgage accounts; cash and pension from accounts | L | E4 resolver (on main); coordinate `index.ts` with E4 | sonnet | table tests, property test "no default unless assumed" | 5 |
| T1.2 | `apps/backend/src/agent/agent-data.service.ts`, `mcp-token.service.ts` (split `mcp.service.ts`) | Implements the provider through services; strips `receiptData`; one load per request; `McpService` keeps only wiring | M | T1.1 | sonnet | spec with in-memory repositories plus real-DB integration | 5 |
| T1.3 | `packages/mcp/src/define-tool.ts` (new) | zod input and output, envelope (6.5), error contract (6.6), scope hook (no-op until T2.1), budget and truncation, `responseFormat`; deterministic registration order | M | T0.5 | sonnet | unit | 5 |
| T1.4 | `packages/mcp/src/tools/read/*` | `get_financial_snapshot`, `get_net_worth_history`, `list_accounts` (short ids), `get_budget_summary`, `get_debt_overview` per 6.4 | M | T1.2, T1.3 | sonnet | personas, golden, size | 5 |
| T1.5 | `tools/read/search-transactions.ts`; backend cursor query | Validated dates, cursor, debit and credit split, untrusted text wrapper | M | T1.3 | sonnet | unit plus Postgres | 5 |
| T1.6 | `tools/simulate/*` | `compare_mortgage_overpay_vs_invest`, `simulate_debt_payoff`, `project_net_worth`, `evaluate_student_loan_overpayment` on the picture; `missing[]` instead of literals; old names removed | L | T1.4 | sonnet | personas, golden | 5 |
| T1.7 | `tools/tax/*` | `get_tax_year_position`, `simulate_salary_sacrifice_and_gift_aid`, `estimate_self_assessment` through the E4 resolver; `verification` from vector sign-off status per year; gating per D4 | M | T1.3, D4; E4 sign-off for "verified" | sonnet | vector-backed tests | 5 |
| T1.8 | `resources/*` | Resources v2 (6.7), with annotations; `executive-snapshot` and `baseline` deleted | M | T1.4 | sonnet | snapshot | 5 |
| T1.9 | `prompts/*` | Prompts v2 with arguments, no embedded data | S | T1.4 to T1.7 | sonnet | unit | 5 |
| T1.10 | `packages/mcp` changelog, docs | Rename table from v1 to v2; `schemaVersion` 2.0 | S | T1.6 | haiku | snapshot update | 5 |
| T1.11 | `user-profile.entity.ts` plus migration, profile DTO, web profile fields | Store `dateOfBirth` (or age band), `taxRegion`, `studentLoanPlan`, `mortgageRateAprPct`, `mortgageTermMonths` (decision D6; coordinate with E16 J4 and E4) | M | D6; E3 migration rules | sonnet | migration spec, web route tests | 1, 2, 4, 5 for the web part |

### Phase 2: scopes, audit, token UI (finishes G-06)

| ID | Area and files | Acceptance criteria | Effort | Deps | Tier | Tests | Laws |
|---|---|---|---|---|---|---|---|
| T2.1 | `token-verifier.ts` (scopes type), `define-tool.ts`, migration of `mcp_tokens.scopes` | Scopes v2 enforced per tool; `INSUFFICIENT_SCOPE` guidance; PAT create validates the requested scope allow-list; `read:identifiable` needs a recent web session | M | T1.3 | sonnet | scope table test per tool | 5 |
| T2.2 | `mcp.controller.ts` DTOs, `mcp-token.service.ts`, Throttler | Name and expiry validated; no "never"; revoke-all; checksum PAT format; Throttler on `/mcp-tokens`; per-token and per-user limits | M | none | sonnet | unit, controller spec | 5 |
| T2.3 | `entities/agent-audit-event.entity.ts` plus migration, `agent-audit.service.ts`, `GET /mcp-tokens/:id/activity` | One row per `tools/call` (6 fields minimum, no values); retention job per D12; included in account deletion (E12 T7.27) | M | T0.9 | sonnet | spec plus Postgres | 5 |
| T2.4 | `apps/web/app/features/ai-connections/components/*` (colocated dirs), route loader and actions for `/app/profile` AI tab, `UserProfilePanel.tsx:980` | Lists tokens from `/mcp-tokens`; create and revoke through route actions and the E5 client; mock generator, "Official MCP SDK v1.0" badge and the sample-data line (after Phase 1) removed; scopes, expiry, last used (`tabular-nums`, `Intl` en-GB), activity; `ConfirmDialog` on revoke; behind a flag until Phase 3 | L | T2.1 to T2.3; E5 client on main; E7/E8/E15 coordination | sonnet | `.test.tsx`, stories in light and dark with `play()`, zero a11y violations | **1, 2, 4**, 5 |
| T2.5 | Consent and disclosure copy (`docs/mcp/consent.md` draft, then UI) | Owner-signed copy per section 9 | S | none | haiku draft, owner signs | none | 5 |
| T2.6 | Context-pack export in the same UI | Anonymised by default; turning it off needs a confirm; a fresh pack from the backend | S | T2.4 | sonnet | `.test.tsx` | 1, 2, 4, 5 |

### Phase 3: distribution (PAT era)

| ID | Area and files | Acceptance criteria | Effort | Deps | Tier | Tests | Laws |
|---|---|---|---|---|---|---|---|
| T3.1 | Railway config (owner), backend env `MCP_PUBLIC_URL`, `MCP_ALLOWED_ORIGINS` | Public HTTPS `/mcp` confirmed; health check; timeout and body limit | S | owner | sonnet plus owner | smoke | 5 |
| T3.2 | `packages/mcp/src/transports/stdio-proxy.ts`, bin | stdio forwards to remote Streamable HTTP with the PAT; host allow-list; no finance-engine dependency in the bin path | M | T0.3, T3.1 | sonnet | in-process server test | 5 |
| T3.3 | `packages/mcp/package.json`, `release-please-config.json`, `.release-please-manifest.json`, publish workflow | Public package (if D2-A), provenance, README; owner adds the npm token or trusted publishing | M | D2, T3.2 | sonnet plus owner | `npm pack` dry-run in CI | 5 |
| T3.4 | `docs/mcp/setup.md` (per client, section 12 table) | Every snippet verified in T7.8 | S | T3.1 to T3.3 | haiku | manual | 5 |
| T3.5 | `apps/marketing/src/pages/McpPage/*`, `McpSpotlightSection/*`, `claims.test.ts` | True claims only: per user vs per token, tool counts, real-data statement; claims rows lifted only with owner sign-off | S | T3.4, E7 process | haiku plus owner | claims test, stories | 1, 2, 4, 5 |
| T3.6 | `packages/mcp/server.json` | Registry entry (optional) | S | T3.3 | haiku | none | 5 |

### Phase 4: low-risk writes with a human in the loop

| ID | Area and files | Acceptance criteria | Effort | Deps | Tier | Tests | Laws |
|---|---|---|---|---|---|---|---|
| T4.1 | zod request schemas for budget entries, account details (balance), accounts (create manual), tax records (create) | Backend validates them (D-08 slice); shared with T6.1 | M | E12 T1.5 to T1.9 or T6.1 | sonnet | controller specs | 5 |
| T4.2 | `pending-agent-change.entity.ts` plus migration, `agent-change.service.ts`, `tools/write/confirm-change.ts` | Propose and confirm per section 7; single use, 10-minute TTL, bound to token and args hash, idempotent replay, audit link; optional elicitation when the client supports it | L | T2.1, T2.3 | sonnet | unit plus Postgres plus replay and expiry | 5 |
| T4.3 | `tools/write/propose-*.ts` | Four propose tools per 6.4; previews in human words | M | T4.1, T4.2 | sonnet | personas | 5 |
| T4.4 | Web AI connections "Agent changes" view (colocated) | Lists changes, undo within 24 hours (D3), optional approvals inbox | M | T4.2, T2.4 | sonnet | `.test.tsx`, stories light and dark | 1, 2, 4, 5 |
| T4.5 | Eval and abuse suite for writes | Injection fixtures cannot reach confirm; no write without confirm in 100% of eval runs | M | T7.4, T4.3 | sonnet | evals | 5 |

### Phase 5: OAuth 2.1 for the remote server

| ID | Area and files | Acceptance criteria | Effort | Deps | Tier | Tests | Laws |
|---|---|---|---|---|---|---|---|
| T5.1 | Spike (read-only plus dashboard) | Confirms AuthKit CIMD and DCR, resource indicator and audience, whether custom scopes are possible, consent and completion flow, refresh behaviour; written note | M | owner (WorkOS dashboard) | sonnet | none | none |
| T5.2 | `token-verifier.ts` OAuth branch using the shared `jose` verifier | Signature, `iss`, `aud` = MCP URL, `exp` required; grant lookup gives scopes | M | T5.1 | sonnet | verifier table tests | 5 |
| T5.3 | `mcp.controller.ts` PRM route, `WWW-Authenticate` | RFC 9728 metadata; scope challenge; 403 `insufficient_scope` | S | T5.2 | sonnet | spec | 5 |
| T5.4 | Web consent page and grants list (colocated) | Scopes, anonymisation and expiry chosen by the user; revoke grant | L | T5.2, T2.4 | sonnet | `.test.tsx`, stories light and dark | 1, 2, 4, 5 |
| T5.5 | Client verification | claude.ai custom connector, Desktop connectors, ChatGPT developer mode, Claude Code OAuth; results recorded | M | T5.3, T5.4 | sonnet plus owner | manual matrix | none |
| T5.6 | Marketing and docs update | OAuth claims only after T5.5 | S | T5.5 | haiku plus owner | claims test | 5 |

### Phase 6: REST contract (with E12)

| ID | Area and files | Acceptance criteria | Effort | Deps | Tier | Tests | Laws |
|---|---|---|---|---|---|---|---|
| T6.1 | `packages/api-contract` (E12 T1.5 to T1.9) | Request schemas added; owner of the package agreed with E12 | M | E12 M1 | sonnet | parser tests | 5 |
| T6.2 | Global zod pipe; all controllers | Every route validated; `body: any` removed (D-08, B-02) | L | T6.1 | sonnet | controller specs | 5 |
| T6.3 | Global exception filter | RFC 9457 with `kind`; web and mobile mapping unchanged | M | T6.2 | sonnet | spec plus web client tests | 5 |
| T6.4 | OpenAPI generation script, committed `openapi.json`, CI drift job | Spec generated from the contract; drift fails CI | M | T6.1 | sonnet | CI | 5 |
| T6.5 | `main.ts` URI versioning; `/v1`; aliases with Deprecation and Sunset | Web (E5 `config.server.ts`) and mobile on `/v1` | M | T6.3; E5 | sonnet | route tests | 5 |
| T6.6 | Cursor pagination on transactions and tax records | Bounded lists | S | T6.2 | sonnet | spec | 5 |
| T6.7 | Throttler, helmet, body size (D-09) | Global defaults | S | none | sonnet | spec | 5 |
| T6.8 | Contract and route-inventory tests | Every client call matches a route and schema | M | T6.4 | sonnet | tests | 5 |

### Phase 7: evals and observability (start with Phase 0)

| ID | Area and files | Acceptance criteria | Effort | Deps | Tier | Tests | Laws |
|---|---|---|---|---|---|---|---|
| T7.1 | Persona fixtures (in-memory plus Postgres seed for tests only) | 5 personas | M | none | sonnet | none | 5 |
| T7.2 | Deterministic tool tests | Section 13 item 2 | M | T7.1, T1.x | sonnet | tests | 5 |
| T7.3 | Golden task set | 40 tasks with graders | M | T7.1 | sonnet | none | 5 |
| T7.4 | `scripts/mcp-eval` | Runner, report, budget cap, prefix A/B | M | T7.3; D10 | sonnet | none | 5 |
| T7.5 | CI job: Inspector CLI smoke plus schema lint | Fails on lint | S | E11 slot | sonnet | CI | 5 |
| T7.6 | Postgres end to end over HTTP | Section 13 item 7 | M | E11 T2/T3 (Postgres in CI) | sonnet | integration | 5 |
| T7.7 | Metrics | Section 14 counters; allow-list schema test | S | T2.3 | sonnet | unit | 5 |
| T7.8 | Release checklist | Client matrix with time to connect | S | T3.4 | haiku | manual | none |

---

## 16. Sequencing against other epics

| Epic | Relationship |
|---|---|
| E1 (done) | Delivered PAT-only and 401s. Follow-ups absorbed here: case-insensitive Bearer and error leak (T0.6), stdio 401 (T0.3, T3.2), re-enabling OAuth (Phase 5) |
| E2 (merged) | No-seeding is on main. E17 removes the same class of fabrication from MCP (Phase 0 and 1). The E2 D7 / E4 D2 sign rule is honoured in the output conventions |
| E4 | Tax tools need vector sign-off for `verified`. Until then D4 applies. The `finance-engine/src/index.ts` and `profile.ts` edits (T1.1, T1.11) must coordinate with E4's open tasks |
| E5 | The web client (`apps/web/app/services/api-client.ts`, route-error helpers) is on main. T2.4 uses it. T6.5 changes the base path in E5's `config.server.ts` |
| E6 | G-06 is implemented by E17 T2.4. Recommend E6 marks G-06 as "finish in E17" |
| E7 | Every copy change goes through the owner and `claims.test.ts` rows (T3.5, T5.6) |
| E8 and E15 | `McpConnectionCard` and `UserProfilePanel.tsx` overlap. T2.4 waits for the E8 web sweeps merge and uses E15 tokens and components if landed |
| E11 | CI slots for T7.5, T7.6 and T6.4 (edits to `.github/workflows/ci-pipeline.yml`). The Postgres-in-CI prerequisite comes from E11 T2/T3 |
| E12 | Shares `@flump/api-contract`, `@flump/api-client` and the error and versioning policy. E12 T7.9 to T7.12 build the mobile AI and MCP screen on T2.1 to T2.3 semantics (scopes, activity). E12 T7.27 account deletion must include E17 tables |
| E16 | D8 decides headline vs preview. Recommendation: preview now (E16 D8-A); headline only after Phase 5 plus the eval targets in section 20 |

**Order.**
1. Start now: Phase 0 (all within `packages/mcp` and `apps/backend/src/mcp.*`), plus T7.1 and T7.3 in parallel. These touch no hotspot files.
2. Phase 1 after Phase 0, in its own worktree. T1.1 coordinates with E4.
3. Phase 2 backend (T2.1 to T2.3) in parallel with late Phase 1. T2.4 after the E8 web sweeps.
4. Phase 3 after Phase 2 and owner actions.
5. Phase 6 in step with E12 M1 (contract packages).
6. Phase 4 after Phase 2, T6.1 and evals, behind D3.
7. Phase 5 last, behind D9 and the T5.1 spike.

---

## 17. Risk register

| # | Risk | Likelihood and impact | Mitigation |
|---|---|---|---|
| R1 | Users act on default-filled or unverified tax figures given by their assistant | High, high | Phase 0 `assumptions` stopgap; Phase 1 provenance; `verification` field; D4 |
| R2 | Indirect prompt injection through merchant text triggers harmful actions | Medium, high | Untrusted wrapper, R2 scope, propose and confirm, injection evals (T4.5) |
| R3 | Spec churn (2026-07-28 stateless, MRTR) while the SDK lags | High, medium | Stateless already; avoid deprecated features; dual-era upgrade task when the SDK ships |
| R4 | WorkOS cannot carry custom scopes or refresh-token limits | Medium, medium | Flump-side grants table; T5.1 spike before committing |
| R5 | npm scope not owned, or publishing secret mishandled | Medium, medium | Owner confirms; trusted publishing; D2-B fallback (remote only) |
| R6 | Remote host not publicly deployed or not stable | Unknown, high | T3.1 gate; no claims until verified |
| R7 | Token-cost blowups in clients (truncation, failures) | High today, medium | T0.4, budgets, size tests |
| R8 | Hotspot conflicts (`UserProfilePanel.tsx`, `index.ts`, CI yml) | Medium, low | Sequencing in section 16 |
| R9 | Regulatory: outputs read as personalised advice | Medium, high | Neutral outputs, notices, legal review (E7) |
| R10 | UK GDPR exposure from data sent to third-party providers | Medium, high | Minimisation, consent copy, DPIA, legal review |
| R11 | Per-process rate limiter fails if Railway scales out | Low, medium | Move to Postgres or Redis limiter when replicas exceed 1 |
| R12 | Eval cost and flakiness | Medium, low | Haiku tier, manual first, tolerance-based grading |
| R13 | Breaking renames annoy preview users | Low, low | Preview label, changelog, one-release name table |
| R14 | Profile schema additions (T1.11) collide with E16 IA decisions | Medium, medium | D6 decided jointly with E16 |

---

## 18. Effort estimate (honest)

Raw agent-days with S = 0.75, M = 2.5, L = 5.

| Phase | Raw days |
|---|---|
| P0 | 12 |
| P1 | 29 |
| P2 | 14 |
| P3 | 8 |
| P4 | 15 |
| P5 | 14 |
| P6 | 19 (part of this would otherwise be E12 or D-08 work) |
| P7 | 15 |
| **Total** | **about 126 raw; about 150 to 160 with review and fix rounds** (E1 needed 1 fix round on about half its tasks) |

- **Read-only real-data preview** (P0 to P3, plus T7.1 to T7.5): about 75 raw, about 90 with review. That is 6 to 9 weeks elapsed with 2 worktrees.
- **Owner time:** about 12 to 18 hours (decisions; copy and consent sign-off; Railway, npm and WorkOS setup; client testing; legal and DPIA coordination).
- **Not counted:** E4 vector sign-off, legal review, E12 contract package work, store or registry review times.

---

## 19. Decisions needed from the product owner

1. **D1. Is MCP a headline feature, and when?**
   - A. Preview label until Phase 5 plus the eval targets are met; then headline.
   - B. Headline as soon as Phase 3 ships (PAT clients only).
   - C. Hide MCP entirely until after launch (E16 D8-B).
   - Recommendation: **A.** PAT-only reach is developer clients. Claims must follow evals. Aligns with E16 D8-A.
   - Blocks: T3.5, T5.6, E16 roadmap.
2. **D2. Distribution.**
   - A. Remote `/mcp` with a PAT header, plus a published `@flump/mcp` that is a thin stdio proxy (for Claude Desktop).
   - B. Remote only; no npm package (Desktop waits for OAuth connectors).
   - C. Publish a self-contained package that computes locally.
   - Recommendation: **A.** C duplicates data access and maths (today's stdio bug class).
   - Blocks: T3.2, T3.3.
3. **D3. Agent writes.**
   - A. Read-only permanently.
   - B. Low-risk writes (budget entry, monthly balance, manual account, tax record) behind `write:*` scopes, with server-enforced propose and confirm, audit and a 24-hour undo; no deletes.
   - C. B plus an in-app approvals inbox that every write must pass.
   - Recommendation: **B**, adding C's inbox only if evals show confirmation is unreliable in a major client.
   - Blocks: Phase 4.
4. **D4. Tax tools before E4 vectors are signed off.**
   - A. Disable tax tools for any year without signed-off vectors.
   - B. Keep them, with `verification.status: "unverified"` and a notice in every response.
   - C. Keep as today.
   - Recommendation: **B** for the preview, switching to A for any year where vectors are known wrong. C is not acceptable.
   - Blocks: T1.7.
5. **D5. Token defaults and lifetime.**
   - A. Default scopes `read:summary` and `simulate`, anonymised; expiry 7, 30, 90 (default) or 365 days; no "never".
   - B. Same, but allow "never" with a warning.
   - C. Short-lived only (30-day maximum).
   - Recommendation: **A.**
   - Blocks: T2.1, T2.2.
6. **D6. Missing profile data that the maths needs** (age or date of birth, region, student loan plan, mortgage rate and term).
   - A. Add these fields to the profile (T1.11). Tools return `missing[]` and the agent asks the user; no defaults.
   - B. No schema change; agents must always supply them as hypotheticals.
   - C. Keep defaults but label them "assumed".
   - Recommendation: **A, with B as the interim** (hypotheticals accepted and labelled). Decide jointly with E16 J4 and E4.
   - Blocks: T1.11, quality of T1.6 and T1.7.
7. **D7. Public developer API.**
   - A. Internal contract only (web, mobile, MCP); `/mcp` is the only third-party surface.
   - B. A read-only public REST API for PAT holders after Phase 5.
   - C. A full public API with writes.
   - Recommendation: **A now; revisit B** once OAuth, audit and evals are proven. MCP already covers personal-agent use.
   - Blocks: none in this epic.
8. **D8. REST versioning.**
   - A. `/v1` URI prefix now, with unversioned aliases deprecated for at least 6 months.
   - B. Header versioning.
   - C. No versioning until a public API exists.
   - Recommendation: **A.** It matches E12's additive-only and minimum-version policy.
   - Blocks: T6.5.
9. **D9. Contract and OpenAPI source, and OAuth server.**
   - A. zod in `@flump/api-contract` as the source, OpenAPI generated from it, WorkOS AuthKit as the MCP authorisation server.
   - B. `@nestjs/swagger` class DTOs as the source, WorkOS AuthKit.
   - C. zod source, and a self-hosted OAuth server.
   - Recommendation: **A.** It reuses E12's packages and E1's JWKS verifier.
   - Blocks: T6.1 to T6.4, Phase 5.
10. **D10. Evaluation spend.**
    - A. Manual eval runs before each MCP release (Haiku tier, capped).
    - B. A plus a nightly scheduled run with a monthly budget cap.
    - C. No LLM evals; deterministic tests only.
    - Recommendation: **A now, B after Phase 3.**
    - Blocks: T7.4.
11. **D11. Offline context-pack export.**
    - A. Keep it (anonymised by default, a confirm to turn that off).
    - B. Remove it in favour of MCP.
    - C. Keep it, but Markdown only.
    - Recommendation: **A.** It is useful for users without MCP clients.
    - Blocks: T2.6.
12. **D12. Audit retention.**
    - A. 13 months, user-visible, deleted with the account.
    - B. 90 days.
    - C. Indefinite.
    - Recommendation: **A** (covers a full tax year plus a margin). Confirm with legal.
    - Blocks: T2.3.
13. **D13. MCP resource URI scheme.**
    - A. Keep `flump://` with paths disjoint from mobile deep links.
    - B. Switch to `flump-mcp://`.
    - C. Use `https://` URIs on the API host.
    - Recommendation: **A.**
    - Blocks: T1.8.

---

## 20. Measurement

| Metric | Definition | Target before a headline claim |
|---|---|---|
| Tool-call success rate | Non-`isError` `tools/call` divided by total, per tool (excluding `MISSING_DATA` that leads to a follow-up answer) | at least 95% |
| Eval task completion | Golden tasks passed (numeric tolerance plus required behaviours) | at least 85% overall, 100% on "no write without confirm" and "no delete" |
| Tool-selection accuracy | Correct first tool in the eval | at least 90% |
| Response size | p95 tokens per call (concise) | at most 1,500 |
| Time to connect | Token created to first successful `tools/call` (server timestamps) | median under 5 minutes (E16 J5) |
| Adoption | Weekly active tokens; users with at least 1 tool call in 28 days; share of active users with a token | baseline after Phase 3 |
| Trust and safety | Revocations within 24 hours of creation; confirm vs decline ratio for writes; injection-suite pass rate | 100% injection-suite pass |
| Reliability | p95 latency per tool; 5xx rate | p95 under 1.5 s; 5xx under 0.5% |

---

## 21. What is unverified

- Whether the backend's `/mcp` is publicly reachable on Railway today, and its hostname.
- Ownership of the npm `@flump` scope.
- Whether WorkOS AuthKit supports custom scopes and Flump-controlled consent for MCP clients.
- Cursor's exact header configuration.
- Elicitation support per client.
- Real token sizes of the current tools (T0.1 measures them).
- Whether the 2026-07-28 spec status is final. It is the target of `/specification/latest`, but no SDK supports it yet.
- Whether `mortgageRate` and `mortgageTermYears` sent by web are persisted anywhere (no backend reference found).
- Whether main CI is green.
- The UK GDPR role analysis (legal).

---

## 22. Sources

- MCP specification 2026-07-28, Key changes: https://modelcontextprotocol.io/specification/2026-07-28/changelog.md
- MCP Tools (annotations untrusted, `isError`, `outputSchema`, security): https://modelcontextprotocol.io/specification/2026-07-28/server/tools.md
- MCP schema, ToolAnnotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`): https://modelcontextprotocol.io/specification/2026-07-28/schema.md
- MCP Resources (application-driven, annotations): https://modelcontextprotocol.io/specification/2026-07-28/server/resources.md
- MCP Prompts (user-controlled): https://modelcontextprotocol.io/specification/2026-07-28/server/prompts.md
- MCP Authorization (RFC 9728, RFC 8707, `WWW-Authenticate` scope, no passthrough): https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/index.md
- MCP Streamable HTTP (`Origin` MUST, headers): https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http.md
- MCP Elicitation (no sensitive data in form mode): https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation.md
- MCP Multi Round-Trip Requests: https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr.md
- MCP Security Best Practices (confused deputy, token passthrough, scope minimisation): https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices.md
- MCP Inspector: https://modelcontextprotocol.io/docs/tools/inspector
- MCP Registry: https://registry.modelcontextprotocol.io/
- Anthropic, "Writing effective tools for agents — with agents" (11 Sep 2025): https://www.anthropic.com/engineering/writing-tools-for-agents
- Claude Code MCP docs (`--header`, `headersHelper`, 10k warning and 25k cap): https://code.claude.com/docs/en/mcp.md
- Claude connectors authentication (`oauth_dcr`, `oauth_cimd`, `none`; static headers beta): https://claude.com/docs/connectors/building/authentication.md
- OpenAI Apps SDK authentication (CIMD, DCR, PKCE): https://developers.openai.com/apps-sdk/build/auth
- WorkOS AuthKit for MCP (CIMD, resource indicators, JWKS verification): https://workos.com/docs/authkit/mcp
- OWASP LLM01:2025 Prompt Injection: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- ICO guidance on AI and data protection: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/guidance-on-ai-and-data-protection/
- RFC 9457 Problem Details: https://www.rfc-editor.org/rfc/rfc9457
- NestJS OpenAPI: https://docs.nestjs.com/openapi/introduction
- npm registry (`@modelcontextprotocol/sdk` latest 1.32.2): https://registry.npmjs.org/@modelcontextprotocol/sdk

## Key files (absolute paths)

Main-state worktree: `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884`

- `/Users/marcgallagher/personal/flump/packages/mcp/src/server.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/types.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/tools/financial-audit.tool.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/tools/uk-tax-trap.tool.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/tools/mortgage-isa.tool.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/tools/section24.tool.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/tools/debt-simulator.tool.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/tools/life-events.tool.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/resources/baseline.resource.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/resources/accounts.resource.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/resources/budget.resource.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/resources/tax-ledger.resource.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/prompts/uk-advisor.prompts.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/auth/token-verifier.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/auth/rate-limiter.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/transports/http.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/src/transports/stdio.ts`
- `/Users/marcgallagher/personal/flump/packages/mcp/package.json`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/backend/src/mcp.controller.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/backend/src/mcp.service.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/backend/src/entities/mcp-token.entity.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/backend/src/entities/user-profile.entity.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/backend/src/finance.controller.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/backend/src/budget.controller.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/backend/src/tax.controller.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/backend/src/user-profile.controller.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/backend/src/main.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/packages/finance-engine/src/profile.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/packages/finance-engine/src/ai-context-pack.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/packages/finance-engine/src/uk-tax-year.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/packages/finance-engine/src/test-vectors/uk-tax.vectors.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/web/app/components/budget/UserProfilePanel.tsx`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/web/app/services/backend-error.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/marketing/src/pages/McpPage/McpPage.tsx`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/apps/marketing/src/claims.test.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/release-please-config.json`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/docs/audit/plans/E12-mobile-rebuild-plan.md`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/docs/audit/plans/E12-feature-inventory.md`
- `/Users/marcgallagher/personal/flump/docs/audit/EPICS.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/DECISIONS.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/SEQUENCE.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/E16-plan-draft.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/E5-plan-draft.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/E1-auth-ledger.md`
