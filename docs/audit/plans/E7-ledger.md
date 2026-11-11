## Round 2 (owner decisions, 2026-11-11)

Applied owner decisions 1-4 incl. web mirrors (T12 W1-W7), removed all legal/policy statements, scoped re-review fixes. Head after round 2: see PR 381. Open: items listed in the PR body "Left for legal / owner". Storybook/axe not run.

## Round 3

Fixed: McpConnectionCard tiles (no 'Zero hallucinations', institution-names wording), marketing FAQ manual-first + coming soon, SecurityPrivacySection both apps (neutral heading, no tick, tokens), McpPage 'no payment feature' (60/min, 300/hr and 8 tools verified in packages/mcp), Footer link 'Security and privacy', 'Get started' buttons, bank dialog COPY only (wizard + add-account dialog; flows unchanged), claims guards extended (marketing) plus new web guard incl. dialogs live-sync phrasing.
Behaviour change: McpConnectionCard `remoteMcpUrl` prop and the remote-tab test ids were removed (round 2).
Follow-ups (out of scope): 'guaranteed' mortgage/overdraft wording on web tool pages (tools.$slug.tsx); 'UK FCA Priority Debt Guardrail Active' label (BudgetDashboard.tsx:632); the seven wizard banks keep `directSync: true` while the wizard says preview covers Monzo and Starling only (check flag, behaviour); raw hex bank colours in ConnectBankWizard and FaShieldAlt #10b981 in AddEditAccountsDialog; provider-specific token hints were collapsed to one string; Storybook/axe not run.
