# E16 execution ledger: PR 5 (remaining demotions, part 1)

## Done in this PR
- **D8-A fake MCP token (F31 area, card only):** `McpConnectionCard` no longer fabricates a `flump_pat_...` token with `Math.random`. With no `onGenerateToken` handler the generate button is replaced by a "not available yet" note; the offline context pack is kept (E17 D11-A). Profile panel passes no handler, so users see the note until E17 wires the real endpoint.
- **F30 Plaid and sandbox adapters:** deleted `packages/banking/src/server/adapters/{plaid,sandbox}.ts` and tests, their barrel exports, and the `plaid`/`sandbox` provider names. No importer outside the package.
- **F16 Budget actuals:** removed the "MTD Settled Actuals" blocks and the "connect a bank to compare" prompt from `BudgetDashboard`, and `actualMtdGbp` from the web `BudgetEntry` type. Nothing ever wrote the value (D2-A: plan-only budget, actuals later from CSV).

## Not done in this PR (still open, with reason)
| Row | Why not yet |
|---|---|
| F29 remove account-history edit UI (D12-B) | Edit mode is woven through `AccountDetailContainer` (385 lines), `AccountDetails` (398) and a 249-line test; needs its own careful PR so the read-only history/chart view survives. |
| F22 stage hero and health score | Already gated on real inputs by the earlier honesty fixes (`HomeDashboard` returns null without a budget). No further cut made; revisit with the dashboard widget work. |
| F23 and F24 dashboard customisation and widgets | Touches profile columns and `HomeDashboard` (large); depends on E15 dashboard widget set (DECISIONS round 3 item 3 gates it). |
| F09 merge bridge card, F17 merge setup wizard, F18 runway demote, F43 childcare copy | Each is a UI merge needing design of the receiving panel; not mechanical. |
| F26 demote bank PAT to Advanced/beta, F27 OAuth/open-banking flag off and delete, F28 synced transactions | Bank-connection flag work is E19 item 4 (one flag, owner-allowlist, stop storing transactions); do as one backend-plus-web change, with a backup first. |
| F45 adopt PayoffStrategyControls and SandboxTemplates | Wiring onto the Debt page is a layout change on a page E15 will rebuild; kept (not deleted) per D10-B. |
| D3-B Self Assessment opt-in (PR 6) | Last, separate PR as instructed. |

No ratchet changes were needed. No routes removed. Docs (`app_functionality.md`, `pages_and_features.md`) do not mention the removed items.
