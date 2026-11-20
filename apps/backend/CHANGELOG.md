# Changelog

## [1.42.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.41.0...flump/backend-v1.42.0) (2026-11-20)


### Features ✨

* **backend:** drop the 12 retired profile columns with a 30-day before-image (audit slice 9) ([b9dc47e](https://github.com/mgallagher56/flump/commit/b9dc47ea79719e2500bd351f11a620b3b1faa17b))
* **tax:** tax_records.account_id, rental share onto property accounts (slice 7 backend) ([e530961](https://github.com/mgallagher56/flump/commit/e530961d51313ce6b38f40cf4178c77b51b52dbf))


### Bug Fixes 🪲

* audit leftovers 3 to 6 (mortgage type, outgoings, budget flags, promo rate) ([6d39246](https://github.com/mgallagher56/flump/commit/6d39246a34a54a5805c529358277a8ed1064f160))
* **data:** clear old take-home salaries and old reset pension zeros (audit leftovers 1, 2) ([6dc8f5c](https://github.com/mgallagher56/flump/commit/6dc8f5cc9d7ac84db007faa3f98bbacb3a8ffedb))
* **data:** freeze the 2026/27 personal allowance in ClearTakeHomeSalaries ([dc8dba2](https://github.com/mgallagher56/flump/commit/dc8dba250ba22cd2cfbb721fd12ecb7aa887238b))
* **data:** keep the threshold helper private in ClearTakeHomeSalaries ([56b5f10](https://github.com/mgallagher56/flump/commit/56b5f10132f1fe82e55508132bc35178ab59f7cd))
* **migrations:** rental share before-image keeps later choices and holds no user id ([b4e4f2f](https://github.com/mgallagher56/flump/commit/b4e4f2fec3af40662f949670a0364c81f53e31a1))
* review findings for audit leftovers (remote MCP account fields, short id, repayment choice) ([5ab7d54](https://github.com/mgallagher56/flump/commit/5ab7d5493e390ebea8203ec9cd42b00738284b03))
* review findings for the data migrations PR ([a5eac12](https://github.com/mgallagher56/flump/commit/a5eac12a9be007dad9510701350a7f06d6f8202d))
* **tax:** a link whose account goes mid-save is a 400; a share rounding to 100 stays sole ([62a6cde](https://github.com/mgallagher56/flump/commit/62a6cde3a55ee520d58aa7fbfc9210f84abcd0c5))
* **tax:** CI fixes after the rebase: one tax record index, sole-or-joint column, timer, wording ([cdd1b8e](https://github.com/mgallagher56/flump/commit/cdd1b8e4d986028d73650179be783694ee9a5ee7))
* **tax:** own line for allowance lost to savings; known tax record categories only ([cd024a6](https://github.com/mgallagher56/flump/commit/cd024a61f164a06bb1dc1cd1eaea4dfcbf803374))
* **tax:** review fixes: self-employed line wording, trimmed category, literal list, dividend assertion ([c196ab0](https://github.com/mgallagher56/flump/commit/c196ab0918589edb34f64c07dadf60277a3903eb))


### Documentation 📙

* **value-map:** the rental share for tax is the account's; estimate and records hold (slice 7) ([acc622e](https://github.com/mgallagher56/flump/commit/acc622ebf1bf2c86ef71e177c543c3a0cf95c8d5))


### Refactor 🔥

* drop apps/mobile-companion, GET/POST /transactions and the displayName and hasSecondIncome responses ([bcfcaf9](https://github.com/mgallagher56/flump/commit/bcfcaf9bf597abb7de932bf1b08fd9580580d2c9))
* review fixes: the data map, comments on who writes transactions, unused FinanceService injections, stale mobile mentions ([f460a02](https://github.com/mgallagher56/flump/commit/f460a02915d10260ebf4ef1b635ce090ac649673))


### Tests 🧪

* **backend:** check the worker's own database name before creating it; prove a non-test URL is refused ([237412b](https://github.com/mgallagher56/flump/commit/237412ba9f672ef07f4a41b642fe21091fd5ba3c))
* **backend:** clear CONTRACT_ENFORCE_GROUPS after each log-volume case ([dda8511](https://github.com/mgallagher56/flump/commit/dda851158c3821c2dd1de9761e39e81c97c8522e))
* **backend:** give each db-project worker its own database so the database specs run in parallel (E41 P2) ([1e770be](https://github.com/mgallagher56/flump/commit/1e770bed61a43a1ddae35322bf5fd7e5d89e43c8))
* **backend:** move the per-worker database helper to test/support and let TypeORM create the database ([0121be8](https://github.com/mgallagher56/flump/commit/0121be8ac951fc927ac9cd2a6f518120ba43d6df))
* **backend:** run non-database specs in parallel, keep database specs serial (E41 P2) ([90b55b0](https://github.com/mgallagher56/flump/commit/90b55b028f008c9e9969f4b4438507da6601564e))
* **backend:** widen the database-spec markers, cap worker database names at 63 bytes, derive from the first URL ([d8c4a16](https://github.com/mgallagher56/flump/commit/d8c4a16262266cf06861b37a9f0fef90c7676b82))


### Miscellaneous 🙃

* **migrations:** rename the tax record index constants Semgrep read as usernames ([f2784f5](https://github.com/mgallagher56/flump/commit/f2784f5b147a02f1b53b95c7ffdf428379a813b3))
* **migrations:** slice 7 migrations into the lane's range (1795550000000, 1795550100000) ([99aa9db](https://github.com/mgallagher56/flump/commit/99aa9db7e07777ece5796cd2f6c941c2c9b056dd))

## [1.41.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.40.0...flump/backend-v1.41.0) (2026-11-19)


### Features ✨

* **accounts:** a Student Loan account's plan goes to the profile when it has none (audit slice 6, L30) ([4593f35](https://github.com/mgallagher56/flump/commit/4593f3586b620473833aac75f08805d35346491a))
* **api-contract:** PATCH /user-profile accepts and ignores the 14 retired fields for one release ([7888d95](https://github.com/mgallagher56/flump/commit/7888d95caa4531af3d9e36401195a23146f7a352))
* **backend:** system audit slice 9 part one, database housekeeping ([df3fdd6](https://github.com/mgallagher56/flump/commit/df3fdd643e3273e56fd034d713add5710818ee19))
* **dashboard:** one colour per section card, a saved section order, and the chooser beside the cards ([22ce2af](https://github.com/mgallagher56/flump/commit/22ce2af834694ed5ce66201e68437c2ed96c7eca))
* **profile:** the setup checklist's dismissed state is stored on the profile (decision 13) ([498b9f6](https://github.com/mgallagher56/flump/commit/498b9f6dd806d74c1252ab9607e82539f2b2da7d))
* slice 9 part two, stop reading and writing 14 dead profile fields (non-web) ([033b1e9](https://github.com/mgallagher56/flump/commit/033b1e9025bdcada3b9fc2320d471a6799508e2e))
* **tax:** finance costs brought forward as a rental tax record ([9f275c5](https://github.com/mgallagher56/flump/commit/9f275c52ee54c4570901f29ddc592f569e4a2f2d))


### Bug Fixes 🪲

* **accounts:** only a plan edit writes the profile, in one conditional update (independent review) ([81d12d5](https://github.com/mgallagher56/flump/commit/81d12d5a4014e7f6456f9e514599e57097352384))
* **backend:** slice 9 review findings: type check skips instead of throwing; stronger tests ([dba448f](https://github.com/mgallagher56/flump/commit/dba448fcc910189f5fab23ab3d31b29eb5bbb738))
* **budget:** review findings on the housing line ([723593e](https://github.com/mgallagher56/flump/commit/723593e9f074481d6e072caac5b559dfff99b3b7))
* keep rental income on the profile; the MCP baseline still reads it ([bf4598b](https://github.com/mgallagher56/flump/commit/bf4598b96abeab59ef2a955c7acbbfe1db333d95))
* **privacy:** the slice 5 rent before-image is erased with its budget line ([7996020](https://github.com/mgallagher56/flump/commit/79960203b82ae84a3b830f2bc0db8dfe7f24433b))
* **profile:** clear saved section orders nobody chose ([6c3f033](https://github.com/mgallagher56/flump/commit/6c3f033c0e0df00d34bd9c7db2570d632fb5931a))
* **profile:** the lifecycle interface takes the checklist change; version compared as instants ([06250ee](https://github.com/mgallagher56/flump/commit/06250ee46137eb6b79f9fd5cc0cc83fd5da83791))
* **profile:** the section order migration runs once and logs counts; orders hold known sections only ([e5bf913](https://github.com/mgallagher56/flump/commit/e5bf913a50bdd36fc1b6c6ad6b04f8f6789cf4b9))
* review findings: keep Dashboard's isDefault reader; looser psa-band export test; drop needless authz restore ([4553411](https://github.com/mgallagher56/flump/commit/45534117c194d7517f0b392407c33cea7bf92417))
* **tax:** brought-forward record counted once and never as a cost ([094f076](https://github.com/mgallagher56/flump/commit/094f076ec15d74f2f865c0bf2961182d57cba309))


### Tests 🧪

* **backend:** match statements by plain text, not regex (Semgrep regex_dos on the new spec) ([22e98c7](https://github.com/mgallagher56/flump/commit/22e98c75486437b3f63d92e5995527e4696bad28))
* housing line link specs, onboarding payload fixtures, value map and parity log ([4db90c4](https://github.com/mgallagher56/flump/commit/4db90c48867db9ded87e9b8c29976519cd477946))
* **privacy:** a financial data reset clears the rent before-image; the migration logs its count ([a081883](https://github.com/mgallagher56/flump/commit/a081883fb491c10e4e23f3f7e8843a74f99719ea))
* **visual:** homeowner Budget baselines from CI (run 44572665057): the mortgage offer reads the saved payment ([4a45cb9](https://github.com/mgallagher56/flump/commit/4a45cb9996f564b8d34f592d22c7ad37d160737a))

## [1.40.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.39.0...flump/backend-v1.40.0) (2026-11-19)


### Features ✨

* accounts hold the home and loans (audit slice 4) ([946450c](https://github.com/mgallagher56/flump/commit/946450c96e4956a2c6761aeedc0fec5dc87158cc))
* **budget:** savings and debt lines linked to one account (audit slice 5, engine and backend) ([274b53a](https://github.com/mgallagher56/flump/commit/274b53a4a62514fb3219f76f3eb36a1f5e7ac7df))
* legacy PAYE salary records no longer replace the salary (audit slice 6, item 6) ([4fbcfc6](https://github.com/mgallagher56/flump/commit/4fbcfc6802c0c248904f1b516c99e7274be40e05))
* pay and pension answers (audit slice 6) ([057a6f7](https://github.com/mgallagher56/flump/commit/057a6f78eb92a9580c4018d506ca1866af0d6a17))


### Bug Fixes 🪲

* a month is checked in only when its check-in was finished (audit slice 4, CH-3) ([f165c99](https://github.com/mgallagher56/flump/commit/f165c99ba641812a6fc5d59eefb2536db7ab7f75))
* **budget:** review findings for slice 5 ([ba1ae58](https://github.com/mgallagher56/flump/commit/ba1ae58ac2df4e355f8eae359ab47709fc7f45b1))
* CI after the rebase (audit slice 4) ([f8f48f0](https://github.com/mgallagher56/flump/commit/f8f48f0d24d263f0c89f7839b1c06229cedecb8c))
* CI findings on slice 5: a constant name Semgrep read as a username; MCP wording the advice guard caught ([e5832d0](https://github.com/mgallagher56/flump/commit/e5832d0e55ad44cd69b247ec12b5e5aed0579988))


### Tests 🧪

* **e2e:** fit the link tests inside the backend's request limits; lint ([54b1a6f](https://github.com/mgallagher56/flump/commit/54b1a6f4cfdb2ca54615ea00b699e3aa3e14bbcc))
* expectations after the rebase onto slice 3 (audit slice 4) ([d8ee28b](https://github.com/mgallagher56/flump/commit/d8ee28b0df2ce7523117a6bd4751c2f0dd1bff67))

## [1.39.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.38.0...flump/backend-v1.39.0) (2026-11-19)


### Features ✨

* audit slice 3, one assembler (E40) ([27dd820](https://github.com/mgallagher56/flump/commit/27dd820db90cebfda3deace6528fa47830db70ee))
* **backend:** E34 C1 a property follows its mortgage's share ([43ec7f1](https://github.com/mgallagher56/flump/commit/43ec7f1723d3bf7b7af291b1fa9b4d8b0e6684f8))
* **budget:** link_kind column, linked lines resolved everywhere, unlink ([d71854b](https://github.com/mgallagher56/flump/commit/d71854b5d4c312ebabaa05fbae0d2f1dd20aee70))
* **budget:** one stored value for take-home and housing, owner budget requests restored ([e8b3156](https://github.com/mgallagher56/flump/commit/e8b3156d6c7e79167e47f1aa31e2aa86ae6e9829))
* E34 C1 joint marking and share on budget entries ([bb294ff](https://github.com/mgallagher56/flump/commit/bb294ff0d6c09f8913058f53aa6bb0d4acb1565e))
* **laws:** one home per value check for the value map (system audit slice 1) ([94d4f32](https://github.com/mgallagher56/flump/commit/94d4f32225cfa7c71ea602a2ebb64239d03bff74))
* **web:** UX Batch E: profile age and pay, check-in day, Self Assessment sources and allowances ([27a214f](https://github.com/mgallagher56/flump/commit/27a214fd447f051325d53cae3cc38b5f676ab5ed))


### Bug Fixes 🪲

* **backend:** keep migration helper functions private so TypeORM can boot ([a9d0fcf](https://github.com/mgallagher56/flump/commit/a9d0fcfd56500022eb79fa5420b52b5df37d4bac))
* **budget:** a saved fact counts only through its linked line; offers say what is not in the budget ([bf67afb](https://github.com/mgallagher56/flump/commit/bf67afb5221511c22b3c6fad7cd60e70d1846fe1))
* **budget:** one resolved budget for web, MCP and pack; one line per linked fact ([969adb7](https://github.com/mgallagher56/flump/commit/969adb7c453eba36ede008e7ac3960ddece65865))
* **budget:** savings rows not essential by default; link take-home and housing by category and choice, never by name ([5d44c9f](https://github.com/mgallagher56/flump/commit/5d44c9f7964e3519533cbb80e8452cf51969aac9))
* coordinator review of slice 2: one estimate rule, CH-4 rule, e2e scoping ([34443c8](https://github.com/mgallagher56/flump/commit/34443c89ab2ef7f0dc75ade4c175b8e6bfb4c7d9))
* **imports:** the commit error names the row reference only ([820644c](https://github.com/mgallagher56/flump/commit/820644c6c4ff58b8f3ceb39eff553f5048aed4bf))
* independent review follow-ups (property syncs only on a real share change, hand-worked housing test, negative rate as 0%, plaintext receipt note) ([70f6d17](https://github.com/mgallagher56/flump/commit/70f6d172d551c7bf6069953c594407f784506ddc))
* independent review follow-ups for UX Batch E ([205351f](https://github.com/mgallagher56/flump/commit/205351f5b306ee0488652256babbf1609d9405c2))
* independent review of slice 3 ([47b7e01](https://github.com/mgallagher56/flump/commit/47b7e014ce670fc55440d122c566e71595555495))
* **laws:** apply the independent review to the value-map check ([94bf727](https://github.com/mgallagher56/flump/commit/94bf7279140f8445505134857a64b85219948965))
* **pension,returns,ui:** pension pounds round-trip to the penny, recorded return majority rule, shared Breathing room wording, Space arming ([8303ad6](https://github.com/mgallagher56/flump/commit/8303ad69518c8075fff85c159f3e68f4b674aa3e))
* security review follow-ups, hand-worked mortgage and lump sum tests, plan decision status lines ([773d5fd](https://github.com/mgallagher56/flump/commit/773d5fd6b006f3d6db0fa1cdf50a93df617ca1f9))
* system audit slice 2, wrong numbers today (E40) ([41c0d08](https://github.com/mgallagher56/flump/commit/41c0d08c74ddfe720eb31625af1a795f8bc26be7))


### Tests 🧪

* **backend:** financial picture isolation test compares amounts as values ([82c0ad7](https://github.com/mgallagher56/flump/commit/82c0ad7feb5e2c8bbfcade5129f02d2270b4dfad))
* pension rate reload and the two migrations against a real database ([2e8f693](https://github.com/mgallagher56/flump/commit/2e8f69349d92fd09a207c9e441883bcac08b90b0))


### Miscellaneous 🙃

* rebase onto slice 1: link_kind in the registry valueMap, views regenerated, DECISIONS round 10a ([6f94a82](https://github.com/mgallagher56/flump/commit/6f94a8235472548cd2e80f65d80e466d716a20d9))

## [1.38.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.37.0...flump/backend-v1.38.0) (2026-11-17)


### Features ✨

* **accounts,debt,tax:** account deletion, home estimate, non-ISA savings, S&S return tracking, BTL mortgages, credit limits & 0% periods ([e612fc5](https://github.com/mgallagher56/flump/commit/e612fc52dbf931a1a84f32d660c059552f3d8ffb))
* **retirement:** one pension projection, friends-beta gate and MoneyHelper link ([4865d36](https://github.com/mgallagher56/flump/commit/4865d3631ebffb3e6fc098a6083e2ae28d419f99))


### Bug Fixes 🪲

* **accounts:** address independent review of the accounts rework ([8a7a2db](https://github.com/mgallagher56/flump/commit/8a7a2db7e30ef16eabbe2013184deaa9878601f6))
* **accounts:** bound credit limits to the column and refuse year 0 dates ([6e05f3f](https://github.com/mgallagher56/flump/commit/6e05f3f2b33ccc9653f9b7cef8ab66385115bbf2))
* **accounts:** rework accounts, debt and tax after review ([79a42ab](https://github.com/mgallagher56/flump/commit/79a42ab6af6496904dbbec1cab195f17d804aa54))
* **accounts:** validate ISO dates without a regex on user input ([ada37f6](https://github.com/mgallagher56/flump/commit/ada37f62ca820a74bc40ffde53058328f23ecd00))
* authz test for GET without a saved plan; shorter header label so the nav fits at 1024px ([24a66f7](https://github.com/mgallagher56/flump/commit/24a66f723b465451ea152e018f57733fa1653051))
* **backend:** retirement GET/PUT, export decrypt, receipt key at boot, safe migration down() (A10, C15, C16, D17) ([d05af08](https://github.com/mgallagher56/flump/commit/d05af08dd277457f168bed563b95995830abd832))
* **retirement:** address independent and UI reviews, browser check ([1fa1c8e](https://github.com/mgallagher56/flump/commit/1fa1c8e85338d394aaf4644a50a1d197f89dc984))


### Tests 🧪

* **retirement:** build the allow-list sample user ids at runtime instead of suppressing Semgrep ([5f7c96e](https://github.com/mgallagher56/flump/commit/5f7c96ecd5970babc74a1cce33c66d354f5348a3))
* **retirement:** mark the allow-list test user ids for Semgrep ([dae6adf](https://github.com/mgallagher56/flump/commit/dae6adfbbf015c52340e9aefa16599056d93695e))

## [1.37.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.36.0...flump/backend-v1.37.0) (2026-11-16)


### Features ✨

* **accounts:** E34 Slice 2 joint ownership & share percentage ([875f666](https://github.com/mgallagher56/flump/commit/875f66696a9300ac9f3e74bcddbe2879f1a3d37f))
* **backend,banking:** SEC-D encrypt tax receipt_data with record id AAD ([7581e25](https://github.com/mgallagher56/flump/commit/7581e259ddf6abb490ce7396e5aca9180e819a08))
* **privacy,api-contract:** E19 portability CSV data export ([5585fbe](https://github.com/mgallagher56/flump/commit/5585fbee82b14184104336e9aebc2c74b9fe22bb))
* **retirement:** E33 S2-S5 backend persistence, MCP tools, and /app/retirement UI ([15e1510](https://github.com/mgallagher56/flump/commit/15e15103b6efe9448ad863657daf81a4a6ae18b9))
* **security:** E36 H2 & H5 SBOMs, fail-closed audit, workspace knip, and MCP prompt-injection suite ([34bdc44](https://github.com/mgallagher56/flump/commit/34bdc44fe6bd8d7001941785f5c6c746c5fbd212))


### Bug Fixes 🪲

* **ci:** build @flump/tokens in check-workspace-deps and setup bun for SBOMs ([1996885](https://github.com/mgallagher56/flump/commit/19968856b7025f48263829b3099cac4e11be0821))


### Tests 🧪

* **authz:** cover GET /user-profile/export/csv IDOR check ([b8cc744](https://github.com/mgallagher56/flump/commit/b8cc744901f7adf9fe7880bfa467312e1ce7c79f))
* **backend:** mock RetirementPlan repo in user-profile.service.spec.ts ([b80815f](https://github.com/mgallagher56/flump/commit/b80815f60844acd69f13353f2b90c9c861270757))
* **backend:** record authn and idor coverage for retirement-plan routes ([66ca64b](https://github.com/mgallagher56/flump/commit/66ca64b1a662ca8d62760570d7a1948b96aefd65))
* **backend:** update entity, migration, authz, and privacy specs for RetirementPlan ([400adfd](https://github.com/mgallagher56/flump/commit/400adfd13191829602e82db0670b1b8cd6638548))


### Miscellaneous 🙃

* **retirement:** rename migration to 1795260000000 and update migrations.integration.spec.ts ([dd19c6d](https://github.com/mgallagher56/flump/commit/dd19c6db2389aa73a3f1ee0d5acd46b5155ee139))

## [1.36.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.35.0...flump/backend-v1.36.0) (2026-11-16)


### Features ✨

* **api:** BE-16 conditional writes on the web, and API tidy (M7, N10, L11) ([6432d65](https://github.com/mgallagher56/flump/commit/6432d65e2a755947d9eb8f832f618884588010cb))
* **banking:** BE-18 bank launch readiness (lock-free refresh, strict token prefix, OAuth state tests) ([3b13bf9](https://github.com/mgallagher56/flump/commit/3b13bf97c50f547f48f25ba20a76c57aad5037fd))


### Bug Fixes 🪲

* **api:** BE-16 review findings: lock order, retry after midnight, one notice ([cf8e699](https://github.com/mgallagher56/flump/commit/cf8e6995fb68402df31729d72d95a1be07f53f90))
* **backend,web:** align route inventory, PUT account contract test, and literal regex in check-conditional-writes ([5cb907b](https://github.com/mgallagher56/flump/commit/5cb907b8c8677e7979363fb96bc6b9f7c3af2a21))
* **banking:** address BE-18 review findings (CAS race, coalescing, NaN expiry) ([3b0c560](https://github.com/mgallagher56/flump/commit/3b0c560a096bf8cfd7ae526c90f3cc333af1c3bf))
* **deps:** update all non-major third-party dependencies ([430cdae](https://github.com/mgallagher56/flump/commit/430cdae297a8e3ba055ca5bcb7f0fbe6a58063c4))
* **security:** replace regex in check-conditional-writes with linear prefix scan ([fd1297c](https://github.com/mgallagher56/flump/commit/fd1297c393b96099782be5f03defbad0ac80c2d9))


### Tests 🧪

* **backend:** increase testTimeout to 15s for real-Postgres tests ([41cfa72](https://github.com/mgallagher56/flump/commit/41cfa72d48918398717dc2d18877d9280aca32c6))

## [1.35.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.34.0...flump/backend-v1.35.0) (2026-11-15)


### Features ✨

* **ci:** BE-17 load smoke, E2E retries off and slim web image; SEC-E checkout credentials, digest pins and root-owned images ([205690c](https://github.com/mgallagher56/flump/commit/205690c96e70c4594e69e8ae2f4692b14e6a571e))
* owner rulings of 15 Nov: estimate heroes, Debt and borrowing, net worth choices, history months, account hero, interest this year, anonymised names ([597d3dd](https://github.com/mgallagher56/flump/commit/597d3dda7c14651c3e6fbcd222ed9709565bf39b))
* **security:** SEC-A keys required at production boot; SEC-F audit_events refuses TRUNCATE and undeclared DELETE ([3bd188b](https://github.com/mgallagher56/flump/commit/3bd188b6065297b412530398ceacd8f768cf6d57))


### Bug Fixes 🪲

* **security:** SEC-A and SEC-F review follow-ups ([e4b8473](https://github.com/mgallagher56/flump/commit/e4b847390afb767a4ba0785aa5f63bacc3979121))


### Tests 🧪

* header snapshots, anonymised labels in the PAT isolation spec, route inventory without the removed seed-defaults call ([73b987b](https://github.com/mgallagher56/flump/commit/73b987b280d2d34c70a84377a7dc7178d7407504))

## [1.34.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.33.0...flump/backend-v1.34.0) (2026-11-14)


### Features ✨

* **backend,mcp:** BE-15 privacy and config completeness, MCP token tightening ([216ae69](https://github.com/mgallagher56/flump/commit/216ae695c1680b9d1b913750cec0b6257677a3cf))


### Bug Fixes 🪲

* **backend:** BE-15 CI fixes: empty RAILWAY variable is not Railway, staging runbook row, no literals Semgrep reads as usernames ([1faa71e](https://github.com/mgallagher56/flump/commit/1faa71edf78c0025eeca91050bcab62490118114))
* **backend:** BE-15 migration takes the next free timestamp after the rebase ([54a9e26](https://github.com/mgallagher56/flump/commit/54a9e26faf3b27c33ead015b1a3022e53207d2da))
* **backend:** rate-limit key derivation never refuses; production-configuration integration test ([92c6f15](https://github.com/mgallagher56/flump/commit/92c6f15480e5d46ecc1ea5b887ffc971a67bb317))

## [1.33.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.32.2...flump/backend-v1.33.0) (2026-11-14)


### Features ✨

* **backend,mcp:** PAT input route for MCP stdio, client policy route, token list refresh ([bc10b6e](https://github.com/mgallagher56/flump/commit/bc10b6e3f960f42c4b3491411d138672c85a5cec))
* **backend:** check-in sources confirmed and calculated (R2-5) ([05f47e5](https://github.com/mgallagher56/flump/commit/05f47e57a4b304457015ff964fa26622ab481425))


### Bug Fixes 🪲

* **backend:** AllowCheckInSources takes the lock through takeMigrationLock ([27e271d](https://github.com/mgallagher56/flump/commit/27e271d56b6f43919cf2ebfa2ead707cc535dab4))
* **check-in:** accept a retried calculated save; drop an unused helper (review) ([8b6e655](https://github.com/mgallagher56/flump/commit/8b6e6551734236e016e24a15664c19aed669cf66))
* **check-in:** no calculated figure once the saved balance has moved on ([e7d493f](https://github.com/mgallagher56/flump/commit/e7d493fa05822dd6a46f7460eca517a24b0b31f2))


### Tests 🧪

* **backend:** migration test uses at() under strict indexed access ([e28e59f](https://github.com/mgallagher56/flump/commit/e28e59fcfffbef176d81dce216011daf541c646c))

## [1.32.2](https://github.com/mgallagher56/flump/compare/flump/backend-v1.32.1...flump/backend-v1.32.2) (2026-11-14)


### Documentation 📙

* **backend:** say why getUserFinancialData ignores its options ([ab8ded4](https://github.com/mgallagher56/flump/commit/ab8ded4c7f479a8408dd18682fabb841c98def8f))


### Refactor 🔥

* **backend:** BE-14 strict types and dead code ([cd2c49c](https://github.com/mgallagher56/flump/commit/cd2c49ca5a7da5f4b04ec7ee11035f231b720d9f))

## [1.32.1](https://github.com/mgallagher56/flump/compare/flump/backend-v1.32.0...flump/backend-v1.32.1) (2026-11-14)


### Bug Fixes 🪲

* **backend:** review findings for BE-13 ([19adc13](https://github.com/mgallagher56/flump/commit/19adc1382f8aaea8471f902a525d7a0925c6e69b))


### Refactor 🔥

* **backend:** move domain code into src/modules (BE-13) ([941f4d2](https://github.com/mgallagher56/flump/commit/941f4d2ab03ec511f1824e54a41eebfe40e51219))
* **backend:** one Nest module per domain, services own the logic (BE-13) ([4410934](https://github.com/mgallagher56/flump/commit/4410934bb559f42dc06591097427091c70102fef))


### Tests 🧪

* **backend:** batched-writes spec names its owner id without a username literal (Semgrep) ([6e99a27](https://github.com/mgallagher56/flump/commit/6e99a2737c3b1aec3945de152cc52e357e3cac0b))
* **backend:** controllers collected through domain modules; agent registers its repositories (BE-13) ([19de67c](https://github.com/mgallagher56/flump/commit/19de67ca486e741fb64f9ef764b00d89ff7bfc31))

## [1.32.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.31.0...flump/backend-v1.32.0) (2026-11-14)


### Features ✨

* **backend:** save the net worth choices and use them in the snapshot ([95f7334](https://github.com/mgallagher56/flump/commit/95f7334263ffc0ca986f017383d3d33553a120be))
* **engine:** net worth basis for the user's choices ([fce3423](https://github.com/mgallagher56/flump/commit/fce3423690d82b11f8a6c94d06f6ad4450d90289))


### Bug Fixes 🪲

* **web,contract:** proxy allows AI connections and imports; drop ignored request keys ([8d6387a](https://github.com/mgallagher56/flump/commit/8d6387a12ad9487c33e38daa3152c7250b8fa886))

## [1.31.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.30.0...flump/backend-v1.31.0) (2026-11-14)


### Features ✨

* **api-client,web,mcp:** BE-10 contract-typed clients on /v1 ([15548e0](https://github.com/mgallagher56/flump/commit/15548e065e7c33b4343e16ea610f5c64cf4d1288))
* **api-contract,backend:** E17 PR C import backend (stage, commit, revert) and agent audit table ([906a307](https://github.com/mgallagher56/flump/commit/906a3075e77cd2b3aef56851f3f77b026c1bc368))
* **backend,api-contract:** BE-09 API contract, server side ([10d45c4](https://github.com/mgallagher56/flump/commit/10d45c4880b551ba45957f3d370ed369dc68cc24))
* **backend,api-contract:** import preview (dry run) and list routes ([5a5d40e](https://github.com/mgallagher56/flump/commit/5a5d40e723e5285b7ad9242ff2f7ae5dae8d567b))
* **backend,web:** BE-07 security, config and observability hardening ([1c5a385](https://github.com/mgallagher56/flump/commit/1c5a385f91072ba1342b705aed47d00ff0f8ca13))
* **backend:** account deletion tombstone table (BE-04) ([c23a278](https://github.com/mgallagher56/flump/commit/c23a278c3e0e0986f4e71a3aefe1bedc77df17de))
* **backend:** account deletion, data export and full reset (BE-04) ([23f26ca](https://github.com/mgallagher56/flump/commit/23f26ca2aacadd3e963652d04b2fc54ee579f0dd))
* **backend:** audit trail, retention purge and consents (BE-06) ([a0ab6a6](https://github.com/mgallagher56/flump/commit/a0ab6a6491b8f11d99b607c4deec8a53038f5d02))
* **backend:** data integrity II — tax year, foreign keys, transactions (BE-08) ([b264b8e](https://github.com/mgallagher56/flump/commit/b264b8ef0a317844ec6764850ee22cd86930d2fc))
* **backend:** sweep expired idempotency keys in the retention job (BE-06) ([b808e9a](https://github.com/mgallagher56/flump/commit/b808e9a27c720bd9c0c723d7563ecca9d3745640))
* **backend:** user_id indexes, pool limits and UTC pin (BE-02) ([9809a34](https://github.com/mgallagher56/flump/commit/9809a3439fbc7b9043556efc6405b6a276970816))
* **housing:** E32 housing cost share, fix-end date and deposit timeline ([859cdb6](https://github.com/mgallagher56/flump/commit/859cdb6fe83f93bd5f0d2198222b3d0d0f06226b))
* **mcp,backend,api-contract:** E17 PR D staging tools, write:stage scope and audit trail ([e86d614](https://github.com/mgallagher56/flump/commit/e86d614c5b4af2aea954940def4656c20225dbf0))
* **web,backend:** E16 PR 9 onboarding focused shell and neutral housing option ([e4ee952](https://github.com/mgallagher56/flump/commit/e4ee9525e8620764d8f95656b47fc71cd01f9a99))


### Bug Fixes 🪲

* adapt BE-04 to the BE-01 and BE-02 laws after rebase ([4422623](https://github.com/mgallagher56/flump/commit/4422623b0abc574dc757933021335265737495a1))
* apply BE-07 security and code review findings ([24ccb8c](https://github.com/mgallagher56/flump/commit/24ccb8c009272081071d3c605052343f1fd4bd21))
* apply review and design-comparison findings ([b725ea6](https://github.com/mgallagher56/flump/commit/b725ea67fb12a76f4b019ce5af7a27d34ff244be))
* **backend,api-contract:** apply E17 PR C review findings to the import pipeline ([26914b5](https://github.com/mgallagher56/flump/commit/26914b52f139d8547e5c120d41f9ccd77c68427a))
* **backend,web,ops:** BE-07 CI fixes ([6bcd81a](https://github.com/mgallagher56/flump/commit/6bcd81a6e1a16a544c5862bd1c941d4c085ba0e9))
* **backend:** BE-02 review fixes for the migration lock and timeouts ([f3f0ec7](https://github.com/mgallagher56/flump/commit/f3f0ec748c4f326a116c90563a2f813f492e026d))
* **backend:** BE-04 review findings for deletion, export and copy ([9300ae1](https://github.com/mgallagher56/flump/commit/9300ae173c1abf1a0d01ad537c201d7a8ab92482))
* **backend:** BE-05 review fixes: seed signs, function search_path, down() lock, entity check ([ff11a22](https://github.com/mgallagher56/flump/commit/ff11a22f3605e1b30b422f65ad15f6af4ec9f242))
* **backend:** BE-06 CI after rebase: runbook row, seed snapshot, Semgrep ([ddb8828](https://github.com/mgallagher56/flump/commit/ddb8828355aa3793a25605e44dd2291e65d43cd8))
* **backend:** BE-08 review fixes ([478a20d](https://github.com/mgallagher56/flump/commit/478a20db7f93c99abaf847ca2a5d5af91776f11a))
* **backend:** BE-12 bank sync, tokens and consent behind the flag ([49941ff](https://github.com/mgallagher56/flump/commit/49941ff4ba988ed2fa3029d9e97116faf096a36a))
* **backend:** BE-12 real bank consent revocation behind the BE-04 seam ([c44e5ac](https://github.com/mgallagher56/flump/commit/c44e5ac7f7e5898bbe9657ef48981b0d3e05cf3a))
* **backend:** cover the BE-05 sign before-image in the user-data registry ([d5778b2](https://github.com/mgallagher56/flump/commit/d5778b27c6b19e7c5fd44b8d1798f5542b8b0cbb))
* **backend:** one liability sign rule on every write path, backfill and DB checks (BE-05) ([2be3c8a](https://github.com/mgallagher56/flump/commit/2be3c8a164222baf277b648addac5225d24d7e25))
* **backend:** order BE-02 migration after BE-05 and fix CI ([a7835fb](https://github.com/mgallagher56/flump/commit/a7835fbc1b09665a6af10a3ab6dac50be6d28fc3))
* **backend:** order the timestamptz migration after BE-12; convert BE-04 tombstone timestamps ([a944648](https://github.com/mgallagher56/flump/commit/a944648ecf16060e101b6717b62e679b26a2a5b5))
* **backend:** register bank_oauth_states in the user-data registry (main green) ([ff440c7](https://github.com/mgallagher56/flump/commit/ff440c7a36d42cbdb5ba7ba37cf54208b1149269))
* **backend:** typed failure codes in the bank consent audit event, fake-provider tests, data map ([ac6f391](https://github.com/mgallagher56/flump/commit/ac6f3916e0214032c19473e82ed954edccee5c5d))
* **banking:** BE-11 bank provider safety behind the flag ([2d4a662](https://github.com/mgallagher56/flump/commit/2d4a662417569edcd1c878b8820c65ec626022aa))
* follow-up sweep after the E21-E31 merges ([4de8bdb](https://github.com/mgallagher56/flump/commit/4de8bdbf9a7a3fc4ecdce4fc7546eaa3e8cca843))
* mark Semgrep false positives and teach the staging seed about tombstones ([9fd5f41](https://github.com/mgallagher56/flump/commit/9fd5f418828db461cdf5ee3c15e27b8a5e27d5a5))
* **ops:** uuid account_id in seed and cleanup scripts; rename Semgrep-flagged test ids ([64bf029](https://github.com/mgallagher56/flump/commit/64bf02990de0ce0771ae82f111502b07ee3de649))
* pre-release pass defects (tax band, 404, tool catalogue, debt payoff, donuts, take-home, titles, layout) ([5341239](https://github.com/mgallagher56/flump/commit/5341239d3dd745dff8af2ffa3f46799d6c9e0634))
* **security:** server-side reset confirmation, audit event, review fixes ([e71c422](https://github.com/mgallagher56/flump/commit/e71c42289ffba64a30ee37a2539d8aeea1bc45c0))
* **web,backend:** E16 PR 9 review fixes ([5c3ad19](https://github.com/mgallagher56/flump/commit/5c3ad1989c12b928c6198df0fcbbc0297da585ae))
* **web:** home counted once from its Property account; mortgage LTV is residential ([8aec193](https://github.com/mgallagher56/flump/commit/8aec1938ff6783fef2ac37549d2b151da0b4da79))


### CI 🤖

* **be-01:** merge gate, supply-chain hardening and readiness paths ([808ab8e](https://github.com/mgallagher56/flump/commit/808ab8e41bbc72e3d968c75d58482fa3da0a98f2))
* **be-01:** review fixes for the Docker change filter, Semgrep errors and the any baseline ([ad1259d](https://github.com/mgallagher56/flump/commit/ad1259da39d5a98df24b43f8750d29be87a7e568))


### Tests 🧪

* **backend:** authz reset calls send the confirmation phrase; 400 without it ([7208d37](https://github.com/mgallagher56/flump/commit/7208d3728774b8e23eb6c02ea73bfa82218dd31b))
* **backend:** imports authz reset sends the confirmation phrase ([42acb39](https://github.com/mgallagher56/flump/commit/42acb397b379e77b1bfbf70f4a9f8a76eea6b461))
* **backend:** manager stubs for transactional doubles; no explicit any in orphan counts ([3f3aca2](https://github.com/mgallagher56/flump/commit/3f3aca2b2076372a41b1f72f2373ac92c7964ba9))
* **backend:** profile facts now carry homeValue and propertyOwnershipShare ([699690c](https://github.com/mgallagher56/flump/commit/699690c5fc86dbaaa2f4cbf3fb1c3d6f0a9bc926))
* **contract:** onboarding seeds the home estimate as a Property account ([2ef6f7f](https://github.com/mgallagher56/flump/commit/2ef6f7f0e73c995c2cf5d94eaeced5facb377e0d))

## [1.30.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.29.0...flump/backend-v1.30.0) (2026-11-14)


### Features ✨

* **api-contract,backend:** finish E21 with response schemas and enforce by default ([8ee17a5](https://github.com/mgallagher56/flump/commit/8ee17a5934cac09851cccf8c53838cf3c743c213))
* **e23:** one financial picture for safe to spend, months of cover and budget totals, plus cross-page consistency harness ([8b61263](https://github.com/mgallagher56/flump/commit/8b6126394fe4962ec61fc9f72640d2a8600049ef))
* **mcp:** prune the MCP surface and add query reads (E17 re-plan PRs A and B) ([13a5910](https://github.com/mgallagher56/flump/commit/13a5910cdb8b762fa7b85ba917d82a64b1b0f2e7))


### Bug Fixes 🪲

* **e23:** review fixes for the financial picture ([f5bcddb](https://github.com/mgallagher56/flump/commit/f5bcddbb0197b9b066bbf3e97e26da134129dcde))
* **mcp:** review fixes for the query reads ([c7a9aef](https://github.com/mgallagher56/flump/commit/c7a9aef574dee87869148173792aa366f5f06173))

## [1.29.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.28.0...flump/backend-v1.29.0) (2026-11-13)


### Features ✨

* **e23:** batch balance check-in endpoint, current-month history upsert and unique account_details month (D22, D23) ([6f13595](https://github.com/mgallagher56/flump/commit/6f1359509c5371f7ba7f439472886b5cca88afc7))
* **e23:** Property, Student Loan and Overdraft account types, student loan plan, no invented property value (D18, D19) ([cbfbb3d](https://github.com/mgallagher56/flump/commit/cbfbb3db83738cfbef49a8d23e5d2d06edfe5733))
* **e30:** monthly snapshots PR1 (backend and engine) and E30 plan ([52531c5](https://github.com/mgallagher56/flump/commit/52531c5878d5812522cc74c58d910593ff742920))
* **mcp:** PAT lifecycle defaults and no receipt blobs in MCP data (E20-N16) ([913028a](https://github.com/mgallagher56/flump/commit/913028a222271261e13f9881c33ff8584590ff0d))
* **mcp:** validate Origin and add MCP_ENABLED kill switch on /mcp (E20-N18) ([c1b308f](https://github.com/mgallagher56/flump/commit/c1b308ff48cb3326db318dd8668f80ea1f9b96d1))
* **web:** onboarding in Direction C, split into step components (E15 T3.2) ([f9491cd](https://github.com/mgallagher56/flump/commit/f9491cd753915163efe737e1e58f6ae9456d0c81))


### Bug Fixes 🪲

* **e23:** count annual tax records once in the tax year of their date, backfill and set end_date ([21cd450](https://github.com/mgallagher56/flump/commit/21cd450c0c03a7c4aa3de3d3e75b5a7e6fd095c4))
* **e23:** derive the annual end date from its date on every write; 400 on a malformed date ([1a2ebed](https://github.com/mgallagher56/flump/commit/1a2ebed04387d8ea92c59c67e36fd9def6e39d1f))
* **e23:** review fixes for check-in (UK month in bank sync, id case, balance validation, a11y) ([3b147d4](https://github.com/mgallagher56/flump/commit/3b147d44da9f2423294d53eaa68766b38955d3bb))
* **e23:** student loan as liability display, engine-derived account totals, plan handling, unknown property value ([f7def9d](https://github.com/mgallagher56/flump/commit/f7def9d5a34f52aaab6a1abb8b5527027521867a))
* **e30:** post-rebase review fixes (atomic sync write, liability deltas, one sign rule, account.id, single clock read) ([f8030b0](https://github.com/mgallagher56/flump/commit/f8030b03f4e53a9d972a7ff32fd102151aff24c4))
* **e30:** review fixes (lower-case ids, liability sign, in-tx authz, lock order, migration dates) ([c216cd6](https://github.com/mgallagher56/flump/commit/c216cd6c267b821d0fe53043550ebdb91117beae))
* **finance-engine:** keep overdrafts out of debt items and liquid cash, clamp runway, signed AI pack and provider balances (C-15 review) ([bf3d61e](https://github.com/mgallagher56/flump/commit/bf3d61e5054cc282eeafbd2073cc430cc2cfb475))
* **finance-engine:** Owed is money owed to the user, an asset, not a debt ([d75877f](https://github.com/mgallagher56/flump/commit/d75877fc66c21ce677ec7628c03be5d076ac1121))
* **mcp:** ignore null and * in MCP_ALLOWED_ORIGINS, tighten warning test (E20-N18) ([fae2498](https://github.com/mgallagher56/flump/commit/fae249881f7fe76984b9ee426fd0cc71f88d1494))
* **mcp:** PAT review follow-ups (E20-N16) ([7eb300b](https://github.com/mgallagher56/flump/commit/7eb300b5379b8a97f417a707826ab8a7da535f33))
* **mcp:** reject non-string Origin, warn on bad MCP_ALLOWED_ORIGINS, more gate tests (E20-N18) ([b4c8cd8](https://github.com/mgallagher56/flump/commit/b4c8cd88523f3ae89c773d93a4f080775d3eb425))
* **tax:** cap bulk tax-record requests at 500 and chunk web callers (E20) ([0609b69](https://github.com/mgallagher56/flump/commit/0609b698c86cf184f1e7ec3be8c152ef3b9a3e16))
* **tax:** order bulk chunks creates-first, validate before caps, add bulkWrite rate class (E20) ([8973e58](https://github.com/mgallagher56/flump/commit/8973e5883660c08d5f96845955c91db4ac4f9155))


### Refactor 🔥

* **mcp:** split McpService into token and agent-data services (E17-N7) ([ed9e7a8](https://github.com/mgallagher56/flump/commit/ed9e7a825a7ed1a63f96f2661a1e25e0e2eb9b31))


### Tests 🧪

* **e20-n23:** IDOR matrix for tax, user-profile, mcp-tokens and MCP across users ([26a672a](https://github.com/mgallagher56/flump/commit/26a672aa2d8bccf24fd83ca8d8657830ecfb1650))
* **e20-n23:** track authn and idor coverage separately, assert 400 and UUID pipe on revoke ([9561ffb](https://github.com/mgallagher56/flump/commit/9561ffb79bbeb1a689b4bce6b8a2a2077888e3eb))
* **e23:** authz matrix row and cross-user test for PATCH /accounts/balances ([d8ea001](https://github.com/mgallagher56/flump/commit/d8ea001387e9339760fe5fbc05146db448d011cd))
* **e30:** align migration tests with E23 unique index and new NOT NULL columns ([3409b9c](https://github.com/mgallagher56/flump/commit/3409b9cf843c7968b443b405f92b94a345efc314))


### Miscellaneous 🙃

* **deps:** remove remix-i18next and unused dependencies ([7993050](https://github.com/mgallagher56/flump/commit/7993050a6bc09253e9edce084ca7925b875129b1))

## [1.28.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.27.0...flump/backend-v1.28.0) (2026-11-13)


### Features ✨

* **backend:** pin the WorkOS issuer to the user_management form (E20-N24) ([628403d](https://github.com/mgallagher56/flump/commit/628403d3f2a071846184f9477d7e608b13b07905))
* **e23:** store onboarding region, birth year, student loan and housing answers (D06, D07, D31) ([7c6319b](https://github.com/mgallagher56/flump/commit/7c6319b69c4743b2272151972d58554691985643))
* **mcp:** count usage per tools/call and key the limiter by token (E17-N6) ([882a624](https://github.com/mgallagher56/flump/commit/882a62420fd654944cbd59ccb40846b291963c1b))
* **tax:** serve receipts through an owner-scoped download route (E20-N15) ([1012547](https://github.com/mgallagher56/flump/commit/1012547486526ef632cf0fb653ef5e08b8d7eb91))


### Bug Fixes 🪲

* **backend:** reject userinfo, query and fragment in WORKOS_ISSUER ([eb13ab2](https://github.com/mgallagher56/flump/commit/eb13ab2781b3edafda762b104ce51c4d7aeb29ad))
* **backend:** scrub everything Nest prints to stdout ([3bb4a97](https://github.com/mgallagher56/flump/commit/3bb4a97514b90427d618c77b2e8837ed578eae3c))
* **deps:** update all non-major third-party dependencies ([70c65ea](https://github.com/mgallagher56/flump/commit/70c65ea34b66b7b89a8054ee00dbcf189dcaae0c))
* **deps:** update sentry-javascript monorepo to v11 ([d8d43ad](https://github.com/mgallagher56/flump/commit/d8d43ad7ea09849b9b377266c08f78bacce1053a))
* **e23:** label the assumed region on onboarding take-home, guard odd ages, token-styled region select ([40af362](https://github.com/mgallagher56/flump/commit/40af362cd5d0edfa93e619ba66af9c36a108da2a))
* **mcp:** record usage only for allowed requests, cap body and batch size (E17-N6) ([c12bea1](https://github.com/mgallagher56/flump/commit/c12bea1203aef09a8d2b85d80efaebd32d35e0c7))
* **observability:** harden Sentry v11 options after security review ([bc278f3](https://github.com/mgallagher56/flump/commit/bc278f32f65327b1c6ec623f3042616111ef3633))
* **observability:** migrate Sentry setup to v11 dataCollection with the same privacy stance ([1b84e6b](https://github.com/mgallagher56/flump/commit/1b84e6b6346b4101b7d1ee8fb315c4b7ecf8f1be))
* **security:** rate-limit marketing SSR route, use randomUUID for fallback account ids ([772d692](https://github.com/mgallagher56/flump/commit/772d692d139f6ea54f5a8ea28146c210916be4a9))
* **tax:** harden receipt route, add manifest entry, test backendFetchBytes (E20-N15) ([a735ee5](https://github.com/mgallagher56/flump/commit/a735ee535eeea12e7b709fee1e9770aaeab8e88f))


### Build 🛠️

* **backend:** keep testing helpers and specs out of dist ([b5e156a](https://github.com/mgallagher56/flump/commit/b5e156a5bb04f22426140deb57c4c2c9e52eb4ac))


### Tests 🧪

* **backend:** assert no x-powered-by header on real responses ([8480341](https://github.com/mgallagher56/flump/commit/848034181ee76083777e1750ae0feb480f7aa916))

## [1.27.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.26.0...flump/backend-v1.27.0) (2026-11-13)


### Features ✨

* **backend:** structured JSON logs and request ids (E18-N4) ([c413b31](https://github.com/mgallagher56/flump/commit/c413b31e6f3600130bfeb3303efa9af8313d6cee))
* **backend:** validate tax receipts (MIME, magic bytes, size, filename) (E20-N14) ([f545735](https://github.com/mgallagher56/flump/commit/f5457352ab89861154e99f7b276be8007e44e6bd))


### Bug Fixes 🪲

* **backend:** harden receipt filename and normalise receipt fields (E20-N14 review) ([cfe19a8](https://github.com/mgallagher56/flump/commit/cfe19a88f945b330314cf09b26c6819154bebbfc))
* **backend:** log aborted requests, harden route and format handling (E18-N4 review) ([5ee95f1](https://github.com/mgallagher56/flump/commit/5ee95f19c20b7bbcffc05a7bfdbc266941eb49c3))


### Refactor 🔥

* **web:** remove dead forecast module key and normalise stored enabledPages (T-IA-8) ([df5a54e](https://github.com/mgallagher56/flump/commit/df5a54ea7a5d3dc1da4aa0d2d79f0f8ddb96c3d8))


### Tests 🧪

* **backend:** authz review fixes: dev-bypass, /mcp, /v1 alias, harness hardening (E20-N22) ([f8d35c4](https://github.com/mgallagher56/flump/commit/f8d35c43ca500562484b70d526c0563d8605721a))
* **backend:** generate JWKS test keypairs once per file ([f0e0dfe](https://github.com/mgallagher56/flump/commit/f0e0dfe04a8e252c84f3f272f8ca7d7e7394db5f))
* **backend:** two-user IDOR harness, route-coverage meta-test, finance and budget matrix (E20-N22) ([81abaa5](https://github.com/mgallagher56/flump/commit/81abaa58cc373e00ca318a1c917260d26d643437))
* **web:** cover forecast checklist step and fall back to default widget sizes (T-IA-8) ([8f067bd](https://github.com/mgallagher56/flump/commit/8f067bd78cd474bde033ba8aa91c04fcd60f8b7b))

## [1.26.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.25.0...flump/backend-v1.26.0) (2026-11-13)


### Features ✨

* **backend:** add nullable term_months and fixed_rate_end_date to accounts ([8606712](https://github.com/mgallagher56/flump/commit/8606712773eb3a9df17af5c68a742cf5f1b673e1))
* **backend:** enforce contract validation behind CONTRACT_MODE=enforce (E21 phase 2) ([b594c35](https://github.com/mgallagher56/flump/commit/b594c3578645d66bdf5cde873405965482757ddd))
* **backend:** in-memory rate limiting per user and per IP (E20-N13) ([2cd7b84](https://github.com/mgallagher56/flump/commit/2cd7b849f0558516da85aed8e5e352d834741d1d))
* **backend:** log contract_rejected when enforce mode answers 400 (E21) ([0f4ae02](https://github.com/mgallagher56/flump/commit/0f4ae0267e919b56ac54e65d5ca5123c0ab19a10))
* **backend:** owner-allowlist MCP and PAT creation (E29-T8) ([1dc4bc4](https://github.com/mgallagher56/flump/commit/1dc4bc401ece801961ea042cee46877a86c1c75c))
* **backend:** readiness checks for pending migrations (E18-N5) ([dd5d99b](https://github.com/mgallagher56/flump/commit/dd5d99be636202d0f6a92afde1c9600cb92e1ea5))
* **backend:** Sentry error reporting, inert without a DSN (E18-N2) ([7c876e5](https://github.com/mgallagher56/flump/commit/7c876e54e2901f8b4f7296a0620659672be9b82e))
* **backend:** serve every route under /v1 as an alias (E21 phase 2) ([0cd1e13](https://github.com/mgallagher56/flump/commit/0cd1e138cdef81ee8bac60d7600a3c8f13ecb9ca))
* **ops:** Railway config as code, inert until config paths are set (E18-N8) ([44ee0b1](https://github.com/mgallagher56/flump/commit/44ee0b114c2ecce10aa956d8959abb3463d50426))


### Bug Fixes 🪲

* **api-contract,backend:** tax cap shape, hold tax back from default enforcement ([7027b17](https://github.com/mgallagher56/flump/commit/7027b176b7ef655ae9354733c24c36c3f6f34ed1))
* **backend:** bound rate-limit store, key IPv6 by /64, tighten classes (E20-N13) ([2259795](https://github.com/mgallagher56/flump/commit/2259795b3ddd311a44b02409bcb1f24ea6df1e94))
* **backend:** fail-closed MCP access, kill switch on tokens, dev-bypass hardening (E29-T8 review) ([74cd1b0](https://github.com/mgallagher56/flump/commit/74cd1b09121bca6c148cff7862763a6e034381f8))
* **backend:** import RateLimit decorator in controllers (E20-N13) ([ac58b41](https://github.com/mgallagher56/flump/commit/ac58b41d1993975e9c089c1aa469bd11850f7a58))
* **backend:** match the /v1 prefix case-insensitively ([27e7354](https://github.com/mgallagher56/flump/commit/27e73547d3c3b2379317e2344950f06b03bd3390))
* **backend:** never let the rejection log turn a 400 into a 500 ([e7f5265](https://github.com/mgallagher56/flump/commit/e7f52652d3927a79767fb6cf3ad48ff20307a4bf))
* **backend:** treat a malformed migrations count as not ready (E18-N5) ([931a40a](https://github.com/mgallagher56/flump/commit/931a40a5c3c7154c29d7fb6c183317182f825626))
* **backend:** withhold Sentry exception messages, keep crash-on-rejection, lazy SDK load (E18-N2) ([6caec03](https://github.com/mgallagher56/flump/commit/6caec03c79f6e664f69ea61c351784ea360cf7ff))
* **ci:** read Nest's protected staticInstanceRef through a cast so the backend test project type-checks ([6c74204](https://github.com/mgallagher56/flump/commit/6c7420447853c26424083ecaf186d2cccc9c842f))
* **ci:** restore Nest's static logger after the Sentry envelope scenario (E18-N2) ([606b3ba](https://github.com/mgallagher56/flump/commit/606b3ba1a524babd4e911e8a74898f1f71b4aac5))
* remove all references to the flump.co.uk domain ([6a5d86a](https://github.com/mgallagher56/flump/commit/6a5d86a9912cf43847a17a717b17a6562e685618))
* **web,finance-engine:** reconcile web payloads with the contract so tax and mcp-tokens enforce (E21) ([f7f1f8b](https://github.com/mgallagher56/flump/commit/f7f1f8b26710a3bf904e3127e8508537af485d1f))


### Build 🛠️

* **docker:** workspace-proof the three server Dockerfiles and add a CI image check (E12 T0.8, T2.23) ([e9455f8](https://github.com/mgallagher56/flump/commit/e9455f8b08fe6da287ac45866a61bc70adc04675))


### Tests 🧪

* **backend:** assert the route inventory still sees every call the browser makes through the /api proxy (E20-N5) ([49266fd](https://github.com/mgallagher56/flump/commit/49266fd04ed759b5503e81a05adeadbd26b377e7))
* **backend:** lower the web call-site floor to 50 after E20-N5 removed the dead HttpProfileAdapter (E20-N5) ([519acdd](https://github.com/mgallagher56/flump/commit/519acdde2e0ae372b34e4e9ccc924e0bdee13734))
* **backend:** MCP guard wiring tests and env docs (E29-T8 review) ([e7b871c](https://github.com/mgallagher56/flump/commit/e7b871c2544f760359054702abe1ca2cfc3913a9))


### Miscellaneous 🙃

* **docker:** harden images (non-root, healthcheck, exec-form CMD, dockerignore) and assert in CI (E18-N6) ([d5a63bc](https://github.com/mgallagher56/flump/commit/d5a63bceedda43730b1d6921c0b8a780865d8850))

## [1.25.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.24.0...flump/backend-v1.25.0) (2026-11-12)


### Features ✨

* **api-contract:** add @flump/api-contract with request schemas and route manifest ([98515fa](https://github.com/mgallagher56/flump/commit/98515faa0b41cde3a367195e73f8d301b3bc7752))
* **backend:** numeric transformer for decimal columns ([b675557](https://github.com/mgallagher56/flump/commit/b6755577f26b7655a6597bbbd34b843e4d40a14a))
* **backend:** shadow-mode request validation against @flump/api-contract ([32e0281](https://github.com/mgallagher56/flump/commit/32e02812d9a9326210ccb3765ef72554352595bc))
* **e19:** bank connection owner-only, stop storing synced transactions ([04842ef](https://github.com/mgallagher56/flump/commit/04842ef09d59e3b9a398d85adfd771c523288f05))
* **e19:** browser storage minimisation and log hygiene ([a36ad79](https://github.com/mgallagher56/flump/commit/a36ad798021863e19f6d796fe426060dc5cc8df6))
* **e19:** closed-beta allowlist guard and invite-only page ([e7f0ae9](https://github.com/mgallagher56/flump/commit/e7f0ae9e3a3d76f0cf4b9f8d47c8ad2d695df7c4))


### Bug Fixes 🪲

* backend and engine agree Self Assessment is off by default; repair main tests ([d4a2d09](https://github.com/mgallagher56/flump/commit/d4a2d09a7c845f5b3e7af67b9bc5825927419ae6))
* **backend:** bound shadow log volume and scale the money tolerance ([b825301](https://github.com/mgallagher56/flump/commit/b8253013cdcc05ab2c133475ad6be8d7211558ad))

## [1.24.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.23.0...flump/backend-v1.24.0) (2026-11-12)


### Features ✨

* **backend:** add /health liveness and /health/ready readiness; enable graceful shutdown hooks ([ab4dad9](https://github.com/mgallagher56/flump/commit/ab4dad9ba0a15cf63402fc383d975a72ac911064))
* **backend:** add baseline and bank-token-clear migrations ([03513fe](https://github.com/mgallagher56/flump/commit/03513fec90c86900b8ea93b44cb48bc4e72e4f3e))
* **backend:** add database config resolver with TLS and strict-environment rules ([4ea4d96](https://github.com/mgallagher56/flump/commit/4ea4d96b30f7fb9a5c48671353fcc83efa6892c3))
* **backend:** add WorkOS JWT and dev-bypass token verifiers with boot validation ([1f25c32](https://github.com/mgallagher56/flump/commit/1f25c32548b3b7b2ba415f3f98966721b4b6f57f))
* **backend:** remove TCP proxy, validate CORS, add helmet and body limits, own-email password reset ([330e6ca](https://github.com/mgallagher56/flump/commit/330e6caa50e36cb9b87614183e9186022166acf1))
* **backend:** RemoveSeededExampleData migration deletes seeded rows and mock identity data ([d1877b1](https://github.com/mgallagher56/flump/commit/d1877b111e61e5713201f4fc683e84e1dfd4c484))


### Bug Fixes 🪲

* **backend:** accept both WorkOS issuer forms, allow WORKOS_ISSUER override, log failing claim, pin jose ([10b9e25](https://github.com/mgallagher56/flump/commit/10b9e25e595d6282c0018c42871b0bfc0b4b6e47))
* **backend:** allow-list tax record writes and verify transaction account ownership ([fe3c9ef](https://github.com/mgallagher56/flump/commit/fe3c9ef26d18a1b33c2bd0f2bddc4ff3087a3f2a))
* **backend:** check account ownership before deleting its transactions ([9b02818](https://github.com/mgallagher56/flump/commit/9b028180b4f48407ae70f06f66d78ab50d9d4da4))
* **backend:** getBudgetEntries never seeds, seed-defaults idempotent, drop reset route ([ed4c2a8](https://github.com/mgallagher56/flump/commit/ed4c2a85c566ce638b2765cbb269c876cfa43345))
* **backend:** guard destructive migration tests and make the token clear run once ([0831a45](https://github.com/mgallagher56/flump/commit/0831a457701188bc73e30302b1270211c30b1902))
* **backend:** ignore client-supplied ids and ownership on account and transaction writes ([9b80210](https://github.com/mgallagher56/flump/commit/9b8021090d6a07f25b7016f208cfcd08060e53b2))
* **backend:** never seed accounts on getAccounts or getPortfolioSnapshot ([a956d7e](https://github.com/mgallagher56/flump/commit/a956d7e361ad70b8027e8486650a56f5bd8c3e0b))
* **backend:** never seed tax records on getTaxRecords, add no-seed guard spec ([b33c7ae](https://github.com/mgallagher56/flump/commit/b33c7ae290aa7ce153be9cfab89e0009be59c7cc))
* **backend:** race-safe lazy profile creation ([bb22354](https://github.com/mgallagher56/flump/commit/bb2235401095c851f4bdb5d2f90d8ab7d2c2e623))
* **backend:** register bank-connections refresh route, reject blank budget name on PATCH ([5a31449](https://github.com/mgallagher56/flump/commit/5a31449b2cb13ce810139ef42e135a2bca22307c))
* **backend:** reject query strings in assertSafeTestDatabase URLs ([6c716f3](https://github.com/mgallagher56/flump/commit/6c716f3cfe85bd1c1c6396a285065e4456f28d50))
* **backend:** require exp claim and make test helper noSub real ([ce5aa44](https://github.com/mgallagher56/flump/commit/ce5aa44c9959ff8684691b318678cd175d45f196))
* **backend:** stop returning bank tokens and handle cleared or undecryptable connections ([277a835](https://github.com/mgallagher56/flump/commit/277a835365dd8932bb07f36cd9e481937a5366fe))
* **backend:** validate database and banking config at boot from a single options source ([2a8ed2a](https://github.com/mgallagher56/flump/commit/2a8ed2add8a65eb43b7bbb0a634d6040710f4070))
* **backend:** verify WorkOS tokens and fail closed, drop mock auth and callback bypass ([3053656](https://github.com/mgallagher56/flump/commit/30536567bb0698e2909fe7756fc0cff093f95406))
* **backend:** warn on plaintext remote DB, document dev schema setup, keep CLI from auto-running migrations ([96d80e2](https://github.com/mgallagher56/flump/commit/96d80e2cfcc0f6ae31b54df9192bb3c081357833))
* **banking:** require the encryption key outside development and throw on failed decrypt ([560eb84](https://github.com/mgallagher56/flump/commit/560eb84166c78f475ae407c76efd70dfcb585f77))
* **deps:** update typeorm to v1 ([ad4cd80](https://github.com/mgallagher56/flump/commit/ad4cd80637c9e59d1dd39728446799cc96eaa54f))
* **mcp:** accept only personal access tokens and return 401 for every auth failure ([1195e94](https://github.com/mgallagher56/flump/commit/1195e94f4e1b60b6a05f9df160a5166df8972b4c))
* **security:** address PR 390 review (honest reset errors, limiter reset and /64 keys, trust-proxy env, CORS warn-and-deny, SECURITY_CONTACT-gated security.txt, isFlumpHost cases) ([5bd34ea](https://github.com/mgallagher56/flump/commit/5bd34ea20bb6ab22bee5b4b929a2b6d05022ccf1))
* **security:** trust one proxy hop in production, nonce marketing theme script, ledger and stale rule ([cb4c1c2](https://github.com/mgallagher56/flump/commit/cb4c1c2e5b8ed52ade52f31f4942fb04923da15c))
* **ui,backend:** name EmptyState landmark, clarify README hash placeholder ([e9eb297](https://github.com/mgallagher56/flump/commit/e9eb2973f5e34584bf5bd31867dddecef896744a))
* web-to-backend contract bugs (account currency, budget entry name, PATCH accounts) ([c4d709b](https://github.com/mgallagher56/flump/commit/c4d709b7aba398be55313255c397319031aea8f5))


### Build 🛠️

* **test:** add coverage include lists per workspace and untrack committed coverage output ([e9d78fd](https://github.com/mgallagher56/flump/commit/e9d78fd3f1144308ad30899dc6f26dfbdfbc19e6))


### CI 🤖

* allow-list the seed-cleanup migration in check:auth, drop mock ids from README ([900aaf0](https://github.com/mgallagher56/flump/commit/900aaf04a0e909ca609552d5309fee8e0127660a))
* run the real-Postgres migration suite in CI and pass its env through turbo ([09cca20](https://github.com/mgallagher56/flump/commit/09cca20fd1bf8d084c71f29c114ff5e8253a0776))


### Documentation 📙

* add pre-deploy checklist and make example secret placeholders fail loudly ([fd91d3a](https://github.com/mgallagher56/flump/commit/fd91d3a1f32f5cc80c95efcb49ea5fef19b83690))
* document database, TLS, banking key and migrations configuration ([32333c7](https://github.com/mgallagher56/flump/commit/32333c766bebda1c9a050e5b59981c9396fb5583))


### Tests 🧪

* **backend:** add cross-user access tests for account, transaction, connection, budget and tax resources ([a842568](https://github.com/mgallagher56/flump/commit/a842568ca859b3c4590a98bc12d5de6fa94e5401))
* **backend:** add web-to-backend route inventory guard (E23 P0-2) ([9fc27ba](https://github.com/mgallagher56/flump/commit/9fc27ba7e643111cb7d30d8ee70de1c9a1b33ba9))
* **backend:** derive migration list from src/migrations via shared discoverMigrations helper ([ba123d7](https://github.com/mgallagher56/flump/commit/ba123d7648be5968479208b0182025c825c1ab32))
* **backend:** fail collection when REQUIRE_DB_TESTS=1 and no test database is set ([00e6709](https://github.com/mgallagher56/flump/commit/00e67098ba395a68defc8e4b88e78e6629a11ee0))
* **backend:** harden contract test (split-field reset, discovered migrations, honest pairing) ([fa11e76](https://github.com/mgallagher56/flump/commit/fa11e7612f06ebc3727e6633af4102c37c7e7540))
* **backend:** load discovered migrations lazily (no top-level await, hoisted vi.mock safe) ([c18685b](https://github.com/mgallagher56/flump/commit/c18685b4ab37cc96cfd493257e10e91b93dda260))
* **backend:** lower route-inventory sanity floors to the real counts ([1b2de34](https://github.com/mgallagher56/flump/commit/1b2de34820d2add1a0f373b3fac33b70e38df61c))
* **backend:** MCP context pack for a new user writes no accounts or data ([e6371b6](https://github.com/mgallagher56/flump/commit/e6371b6d1dd8db88711bba5d4857a42c75e66c25))
* **backend:** require 'test' as a whole word in the safe test database name ([983c7c1](https://github.com/mgallagher56/flump/commit/983c7c1f8e0b06e2a650dc9b215646eda4370c1d))
* **backend:** run vitest files serially so real-Postgres suites do not race ([f1db970](https://github.com/mgallagher56/flump/commit/f1db97049ccc7388dc9ae5409995288159e2c3e8))
* **backend:** tighten route inventory (no guessing, strict param matching, pinned counts) ([7ca7a70](https://github.com/mgallagher56/flump/commit/7ca7a70667bffe6f8d6e4cd9e4d7d072bac0ab2b))
* **backend:** web-to-backend contract test on real Postgres (E23 P0-3) ([94d783c](https://github.com/mgallagher56/flump/commit/94d783c91eb5602e0547441e8b0276cc350de645))
* **ci:** route tests, audit gate, token and tabular-nums ratchets, coverage floors ([e96cf81](https://github.com/mgallagher56/flump/commit/e96cf81e8e858030899848f57a8a1d7904e86fdc))
* coverage tasks (turbo otherwise strips them and the suite skips). ([09cca20](https://github.com/mgallagher56/flump/commit/09cca20fd1bf8d084c71f29c114ff5e8253a0776))
* keep web onboarding twin literal (web tsconfig cannot import backend files); no Function type ([89da968](https://github.com/mgallagher56/flump/commit/89da968b9bd4f31f088b2ee5a436b553a017c3f8))


### Miscellaneous 🙃

* **backend:** type-check test/ via tsconfig.test.json in check-types ([13830e9](https://github.com/mgallagher56/flump/commit/13830e9c5ba182ddd662785c24f0c8d93aabd9b9))

## [1.23.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.22.2...flump/backend-v1.23.0) (2026-11-11)


### Features ✨

* **marketing,backend,web:** add unit tests and increase vitest coverage across backend and marketing apps ([5473e7d](https://github.com/mgallagher56/flump/commit/5473e7dc59fee7cab67dc250bbd124d133398897))

## [1.22.2](https://github.com/mgallagher56/flump/compare/flump/backend-v1.22.1...flump/backend-v1.22.2) (2026-11-11)

### Miscellaneous 🙃

- **backend:** fix user profile controller ([be5e275](https://github.com/mgallagher56/flump/commit/be5e275a1fb979d94010a5246c70be7c618eb782))

## [1.22.1](https://github.com/mgallagher56/flump/compare/flump/backend-v1.22.0...flump/backend-v1.22.1) (2026-11-11)

### Bug Fixes 🪲

- **backend:** fix dockerfile ([6f869cf](https://github.com/mgallagher56/flump/commit/6f869cf012ec42948fd2258ad44ea2d5219bf2c2))

## [1.22.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.21.3...flump/backend-v1.22.0) (2026-11-10)

### Features ✨

- **architecture:** resolve design system review findings, colocated directory law, and strict backend types ([4806f3a](https://github.com/mgallagher56/flump/commit/4806f3a34fb7d4eb3912913853177a46d287b0ff))
- **banking:** enable live Open Banking for all popular banks and add Trading 212 ([bcd56d6](https://github.com/mgallagher56/flump/commit/bcd56d6da4a19f00d4afe609c60a2df26e53ebb3))
- **banking:** remove dummy data and enable real bank connections ([a78b7de](https://github.com/mgallagher56/flump/commit/a78b7ded2d7063597497d675173900b059cba2a6))
- **design-system:** consolidate semantic tokens, enforce colocated architecture, and configure Storybook 10 suite ([b629a1b](https://github.com/mgallagher56/flump/commit/b629a1bf0fe89ea03bfab4eedb89f7ff882f007e))

### Bug Fixes 🪲

- **ci:** add @radix-ui/react-tabs to ui dependencies and fix backend account intake types ([7f996b1](https://github.com/mgallagher56/flump/commit/7f996b1f442b62ab255945438360a504f85a1114))
- **docker:** include banking and finance-engine package.json in Dockerfiles ([83923df](https://github.com/mgallagher56/flump/commit/83923df4d914395482137681cd7380e547839df9))

### Refactor 🔥

- **arch:** deepen modules, consolidate finance engine, and isolate banking seam ([d516793](https://github.com/mgallagher56/flump/commit/d5167938b6e343439c9bcdea944d49365162d66d))

## [1.21.3](https://github.com/mgallagher56/flump/compare/flump/backend-v0.0.1...flump/backend-v1.21.3) (2026-11-10)

### Features ✨

- add pension and savings pages, compound forecasters, UK auto-enrolment rules, and onboarding wizards ([fcae1cb](https://github.com/mgallagher56/flump/commit/fcae1cb654048091caa53443e4af4887baed5403))
- add user initials thumbnail and profile picture upload support ([6612d56](https://github.com/mgallagher56/flump/commit/6612d56a088a0613e91dbed272798afa01995657))
- **backend:** add production Dockerfile and host binding ([864eb24](https://github.com/mgallagher56/flump/commit/864eb24cd107025093cfb9f5b3f07640a8f57256))
- improve tax planner, profile settings, budget customization, and dashboard UX ([134de6f](https://github.com/mgallagher56/flump/commit/134de6fb7ddef2b8d3be5abdf18ff5e8e8b12288))
- simplify pension forecaster UI, fix mobile nav height, and improve runway calculator ([8abe89f](https://github.com/mgallagher56/flump/commit/8abe89fe4bb9848d8d7725385842411aafa193dd))
- **ui:** institutional fintech UI/UX refactor and 2-column simulator layouts ([92885f1](https://github.com/mgallagher56/flump/commit/92885f128d9ac4526aa1496d85b8ee96de2b3816))
- **ux:** embed interactive sandboxes, connect mobile bottom bar, add centered donut metric, and remove health scoring ([eba2184](https://github.com/mgallagher56/flump/commit/eba21845efa86e616873f5385557e1c199048724))

### Bug Fixes 🪲

- **deps:** pin dependencies ([b69b5ce](https://github.com/mgallagher56/flump/commit/b69b5cebf960dfa37f3176c5d1bce0a9f14c88be))
- **deps:** pin dependencies ([d5963a6](https://github.com/mgallagher56/flump/commit/d5963a680c465b63671523ce26ceb788ee341dad))
- **deps:** update nest monorepo to v12 ([8083ce7](https://github.com/mgallagher56/flump/commit/8083ce7fb2c272fa58bd10027ef1287fed6af272))

### Refactor 🔥

- **backend:** delegate banking sync, sign rules, and crypto to @flump/banking ([829ce87](https://github.com/mgallagher56/flump/commit/829ce876cd4af933e353d227fcf05ebdb9807e7a))

### Miscellaneous 🙃

- **deploy:** configure per-service Dockerfile paths and inject runtime API_URL ([265c7b0](https://github.com/mgallagher56/flump/commit/265c7b07ac4e684a949c30dcf53ef0ca86e2dea8))
- **deps:** prune unused dependencies and align vitest versions ([e08b3bc](https://github.com/mgallagher56/flump/commit/e08b3bc4948ce28eb1f8efc25d243d8fa89db6c7))
- re-architect monorepo with bun, nestjs, react 19, and radix ([6e143b1](https://github.com/mgallagher56/flump/commit/6e143b19a7f307c88af390e3207f9f8f1285ae09))
- run lint and typescript checks and fix violations ([b5975fb](https://github.com/mgallagher56/flump/commit/b5975fb7d62aa7aa70aa281b43b11cdbf5d8d9c7))
- stop tracking environmental configurations and build artifacts ([6bd773a](https://github.com/mgallagher56/flump/commit/6bd773a1db81c0972c2afb07e9a18e8ebd2bb42a))
- **web:** release 1.20.0 ([1f2a83d](https://github.com/mgallagher56/flump/commit/1f2a83d1b3f1b2470283e3dc60bd627a7444f34e))
- **web:** release 1.21.0 ([a1a66d3](https://github.com/mgallagher56/flump/commit/a1a66d35611c46a5f98d6dac4e155dd219d42fd3))
- **web:** release 1.21.3 ([cba2855](https://github.com/mgallagher56/flump/commit/cba28559b66c1065b2e654d9e32d11eb463152eb))
