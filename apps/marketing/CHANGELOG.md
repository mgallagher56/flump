# Changelog

## [1.26.0](https://github.com/mgallagher56/flump/compare/flump/marketing-v1.25.0...flump/marketing-v1.26.0) (2026-11-13)


### Features ✨

* advice-language guard with ratcheting allow-list (E29-T3) ([780f75e](https://github.com/mgallagher56/flump/commit/780f75e47d675f7820ff741d4e211cafe22fe153))
* **ops:** Railway config as code, inert until config paths are set (E18-N8) ([44ee0b1](https://github.com/mgallagher56/flump/commit/44ee0b114c2ecce10aa956d8959abb3463d50426))
* **ui:** illustrations, teal logo, housekeeping CoachCard copy (E15 round 5 PR 6) ([14f119b](https://github.com/mgallagher56/flump/commit/14f119be63a27e7b633f814e6ba5ca2203e7e7cf))


### Bug Fixes 🪲

* **marketing:** case-insensitive route status and Sitemap line in robots.txt ([9589cb9](https://github.com/mgallagher56/flump/commit/9589cb99c5e32e234bea68708386306221540117))
* **marketing:** make MCP spotlight payload box keyboard-focusable ([070ac8d](https://github.com/mgallagher56/flump/commit/070ac8d3bf3892fe7f35beea177be4b561d4603a))
* **marketing:** pre-beta quick wins (R-08 hydration, R-09 placeholders hidden, R-10 copy, R-12 badge contrast, R-13 404/title/sitemap/favicon) ([eb6cd85](https://github.com/mgallagher56/flump/commit/eb6cd852ee5592a8816b5ac07fc42d5c1043f49d))
* remove all references to the flump.co.uk domain ([6a5d86a](https://github.com/mgallagher56/flump/commit/6a5d86a9912cf43847a17a717b17a6562e685618))
* **web:** allow-list E17-N21 eval grader and fixture hits (E29-T3) ([d7d40be](https://github.com/mgallagher56/flump/commit/d7d40beeec0f332051395f2baf137b995ec370ec))


### Build 🛠️

* **docker:** workspace-proof the three server Dockerfiles and add a CI image check (E12 T0.8, T2.23) ([e9455f8](https://github.com/mgallagher56/flump/commit/e9455f8b08fe6da287ac45866a61bc70adc04675))


### Tests 🧪

* **marketing:** assert hidden-placeholder default in PricingPage stories ([2435441](https://github.com/mgallagher56/flump/commit/2435441458610e217c4c57534860c0dbb4060cd9))


### Miscellaneous 🙃

* **docker:** harden images (non-root, healthcheck, exec-form CMD, dockerignore) and assert in CI (E18-N6) ([d5a63bc](https://github.com/mgallagher56/flump/commit/d5a63bceedda43730b1d6921c0b8a780865d8850))
* **launch:** FLUMP_LAUNCH placeholder build guard for web and marketing (E24-T1) ([f2d83eb](https://github.com/mgallagher56/flump/commit/f2d83eb4bf13e062809fea342bbc19a592117871))
* remove JetBrains Mono (keep Inter + Plus Jakarta Sans only) ([15ad262](https://github.com/mgallagher56/flump/commit/15ad262bbdd40dc0012f746d3a74fadd43e1cc10))

## [1.25.0](https://github.com/mgallagher56/flump/compare/flump/marketing-v1.24.0...flump/marketing-v1.25.0) (2026-11-12)


### Features ✨

* **api-contract:** add @flump/api-contract with request schemas and route manifest ([98515fa](https://github.com/mgallagher56/flump/commit/98515faa0b41cde3a367195e73f8d301b3bc7752))
* **e19:** guidance-not-advice notice and neutral copy ([5219922](https://github.com/mgallagher56/flump/commit/521992232369d6338bc4f5fac6c4c86c04127276))
* **e19:** self-host fonts, drop Google Fonts ([390e6f8](https://github.com/mgallagher56/flump/commit/390e6f827efb2689dc66c763cafafd19d79af224))

## [1.24.0](https://github.com/mgallagher56/flump/compare/flump/marketing-v1.23.1...flump/marketing-v1.24.0) (2026-11-12)


### Features ✨

* **security:** marketing CSP and generic 500, security.txt, MCP generic errors and failed-auth limiter, security docs ([1a60214](https://github.com/mgallagher56/flump/commit/1a602141db071a83e6f422977fedbed3ba6e93fb))
* status text colours use status.*.text tokens (E8 T35), storybook router mock exports MemoryRouter ([ace97cb](https://github.com/mgallagher56/flump/commit/ace97cb0a5247021750fcdbf7f30c3f801ca1e31))
* Storybook a11y gate (vitest browser project, light/dark runs, waiver ratchet, non-required CI job) ([c4e5ed4](https://github.com/mgallagher56/flump/commit/c4e5ed400534c471c89af3691c19bd07dc6d97b2))
* **web,marketing:** add healthz, robots.txt and X-Robots-Tag noindex unless ALLOW_INDEXING=true ([529bcab](https://github.com/mgallagher56/flump/commit/529bcab1080392421a4a35bb8175961b8a59d7a2))
* **web:** E8 form-field a11y, primary.solid sweep, focus/scroll css, keyboard and dialog fixes ([c857b78](https://github.com/mgallagher56/flump/commit/c857b78561cae6a1c1c996c5cd2cd0cbb2f77a6d))
* **web:** E8 landmarks, chart figures, live regions, icon-button labels, a11y lint rules to error ([5066d00](https://github.com/mgallagher56/flump/commit/5066d00b559d76f276302826b299d014af380ca3))


### Bug Fixes 🪲

* **ci:** refresh stale design-token baseline, add ToolPage tests for marketing branch floor ([f9c3599](https://github.com/mgallagher56/flump/commit/f9c35995f1e33cf3ec947484f4033369e06d5bd1))
* **marketing:** give the McpSpotlightSection outline button readable text on the contrast panel ([020453c](https://github.com/mgallagher56/flump/commit/020453cd2a30e4573a22488fd8b94a518b48c638))
* **marketing:** remove fake security enquiry form and false confirmation ([8f2a133](https://github.com/mgallagher56/flump/commit/8f2a13320d8731b639c674acb8e0444475a7f569))
* **marketing:** remove unsupported FCA, security, pricing and MCP claims (E7) ([6278f57](https://github.com/mgallagher56/flump/commit/6278f571a71e6abf59ec4025d27067cbe7003092))
* **marketing:** use the secondary Button on the McpSpotlightSection contrast panel ([250b225](https://github.com/mgallagher56/flump/commit/250b225a421116c4b9b408369c9c530ddb74b862))
* **ops:** address PR review (owner id checks, mock-identity review, backup verification, recovery commands, robots/ALLOW_INDEXING, CI runs ops tests) ([841a8a1](https://github.com/mgallagher56/flump/commit/841a8a160b6327419533e3c58b21964cda27316a))
* round-2 review (rule-scoped a11y waivers, tab-order sweep, storybook alias, spinner, labels) ([a7e68f0](https://github.com/mgallagher56/flump/commit/a7e68f08d4d9acc8381203a4c9a488539401d1c1))
* **security:** address PR 390 review (honest reset errors, limiter reset and /64 keys, trust-proxy env, CORS warn-and-deny, SECURITY_CONTACT-gated security.txt, isFlumpHost cases) ([5bd34ea](https://github.com/mgallagher56/flump/commit/5bd34ea20bb6ab22bee5b4b929a2b6d05022ccf1))
* **security:** trust one proxy hop in production, nonce marketing theme script, ledger and stale rule ([cb4c1c2](https://github.com/mgallagher56/flump/commit/cb4c1c2e5b8ed52ade52f31f4942fb04923da15c))
* **web,marketing:** apply owner copy decisions, remove legal statements, align web copy (E7) ([32f9d2f](https://github.com/mgallagher56/flump/commit/32f9d2f56035b11474cfc31691e515eb41f59695))
* **web,marketing:** round 3 copy fixes, bank dialog copy, claims guards (E7) ([16ae682](https://github.com/mgallagher56/flump/commit/16ae682f314c19c6f2d6434010151d1dd04f6516))
* **web,ui:** add RouteErrorBoundary styles file to satisfy colocation law, include scanned app files in ui test cache inputs ([e45a5dc](https://github.com/mgallagher56/flump/commit/e45a5dc52dcf83df64be9682a4562f32e25865fa))


### Build 🛠️

* **test:** add coverage include lists per workspace and untrack committed coverage output ([e9d78fd](https://github.com/mgallagher56/flump/commit/e9d78fd3f1144308ad30899dc6f26dfbdfbc19e6))


### Tests 🧪

* **ci:** route tests, audit gate, token and tabular-nums ratchets, coverage floors ([e96cf81](https://github.com/mgallagher56/flump/commit/e96cf81e8e858030899848f57a8a1d7904e86fdc))
* **marketing:** waive color-contrast on McpSpotlightSection Light story like Default/Dark ([c6f931e](https://github.com/mgallagher56/flump/commit/c6f931e454dd8340d54192c0d2ce6a6509a2583a))


### Miscellaneous 🙃

* **marketing:** revert incidental tsbuildinfo changes ([11acd0f](https://github.com/mgallagher56/flump/commit/11acd0fe0e6b392ff90c3fb1e16fc8d4c7dda205))

## [1.23.1](https://github.com/mgallagher56/flump/compare/flump/marketing-v1.23.0...flump/marketing-v1.23.1) (2026-11-11)


### Bug Fixes 🪲

* **web,marketing:** fix dockerfiles ([d9f8516](https://github.com/mgallagher56/flump/commit/d9f851690dcd3f376c7d0e1ccc6de48d73af909b))

## [1.23.0](https://github.com/mgallagher56/flump/compare/flump/marketing-v1.22.0...flump/marketing-v1.23.0) (2026-11-11)


### Features ✨

* **marketing,backend,web:** add unit tests and increase vitest coverage across backend and marketing apps ([5473e7d](https://github.com/mgallagher56/flump/commit/5473e7dc59fee7cab67dc250bbd124d133398897))

## [1.22.0](https://github.com/mgallagher56/flump/compare/flump/marketing-v1.21.3...flump/marketing-v1.22.0) (2026-11-10)

### Features ✨

- **design-system:** consolidate semantic tokens, enforce colocated architecture, and configure Storybook 10 suite ([b629a1b](https://github.com/mgallagher56/flump/commit/b629a1bf0fe89ea03bfab4eedb89f7ff882f007e))
- **marketing,web:** add MCP marketing page, homepage spotlight and in-app setup instructions ([6fc69ac](https://github.com/mgallagher56/flump/commit/6fc69ac8c278129cb92ae98fc4165cfb21d8219f))

### Bug Fixes 🪲

- **ci:** add @radix-ui/react-tabs to ui dependencies and fix backend account intake types ([7f996b1](https://github.com/mgallagher56/flump/commit/7f996b1f442b62ab255945438360a504f85a1114))
- **docker:** include banking and finance-engine package.json in Dockerfiles ([83923df](https://github.com/mgallagher56/flump/commit/83923df4d914395482137681cd7380e547839df9))
- **marketing:** resolve production web app URL and eliminate localhost fallback ([f024ebb](https://github.com/mgallagher56/flump/commit/f024ebba94d9f617c851005f0992ac1bd4ee0eae))

### Refactor 🔥

- **arch:** deepen modules, consolidate finance engine, and isolate banking seam ([d516793](https://github.com/mgallagher56/flump/commit/d5167938b6e343439c9bcdea944d49365162d66d))
- **marketing:** align MCP components with colocated token laws and add agent component guidelines ([69929e3](https://github.com/mgallagher56/flump/commit/69929e3fdd9bce1908a7f62589454c1de7609439))

### Tests 🧪

- **web:** add test for AI & MCP profile tab and refine Radix tab events ([4c159aa](https://github.com/mgallagher56/flump/commit/4c159aaf0e771419d9f05cf9be8f1f069e632ae4))

## 1.21.3 (2026-11-10)

### Features ✨

- add pension and savings pages, compound forecasters, UK auto-enrolment rules, and onboarding wizards ([fcae1cb](https://github.com/mgallagher56/flump/commit/fcae1cb654048091caa53443e4af4887baed5403))
- **copy:** comprehensive en-GB copy, typography, and style guide refresh ([7834dec](https://github.com/mgallagher56/flump/commit/7834decd5128b603b474fb52cfcb0a9de94de3bf))
- **design-system:** overhaul typography, section rhythm, financial diagrams, and responsive accessibility ([8fe6be3](https://github.com/mgallagher56/flump/commit/8fe6be31f01d6ebdbd83864b1ccd6ee856b6b544))
- **hero:** enlarge hero scale, typography, and visual impact ([c196275](https://github.com/mgallagher56/flump/commit/c1962752d87173324e6c4d42c5d70a1ed3fdf985))
- **illustrations:** integrate 3D fintech illustrations across marketing and app ([c7085ac](https://github.com/mgallagher56/flump/commit/c7085aca29a99d29067b567b0995039070d52a42))
- implement flump architecture blueprint, uk finance engine, banking package, and full lifecycle ux ([d52015b](https://github.com/mgallagher56/flump/commit/d52015b1ff897fba21887cec06fd4ffaa4a8a75c))
- implement UK debt payoff hub, adaptive financial stage UX, and marketing deployment ([8a2f446](https://github.com/mgallagher56/flump/commit/8a2f446283a9853dc65aa57d9449129f984acffb))
- **marketing,web:** implement domain split architecture and dark mode theme ([56817db](https://github.com/mgallagher56/flump/commit/56817db253b7fd23bedc375e2588aa42069ea3eb))
- **marketing:** add mobile menu to header, clean navigation and remove unused guide pages ([46f5006](https://github.com/mgallagher56/flump/commit/46f500685c52f5029d386ead476a378255e13a26))
- **nav:** keep sign up and log in buttons accessible in mobile headers ([0c79909](https://github.com/mgallagher56/flump/commit/0c799092bf4779ab5b692887847eaf4969dfbb35))
- **onboarding:** simplify baseline onboarding and streamline marketing homepage ([a0ae096](https://github.com/mgallagher56/flump/commit/a0ae0962c45421781d0fb749f264d2dc3164b660))
- **onboarding:** simplify baseline onboarding and streamline marketing homepage ([2b603dc](https://github.com/mgallagher56/flump/commit/2b603dc825ecba31bda62b5d52d10935abb06c32))
- **ui:** complete frontend design review, domain styling, and UX improvements ([a2b734b](https://github.com/mgallagher56/flump/commit/a2b734b5db719e34ae264535e5bcf908476b9913))
- **ui:** enforce design tokens and accessible typography across marketing and web apps ([e457b9e](https://github.com/mgallagher56/flump/commit/e457b9ea00bd878c71a6b6f50fe8d405c27d2e8a))
- **ux:** embed interactive sandboxes, connect mobile bottom bar, add centered donut metric, and remove health scoring ([eba2184](https://github.com/mgallagher56/flump/commit/eba21845efa86e616873f5385557e1c199048724))

### Bug Fixes 🪲

- **auth:** align local redirect URIs and prevent post-login blank page ([0b2cbfb](https://github.com/mgallagher56/flump/commit/0b2cbfb931d330d446e143d350bc6783c601adcb))
- **ci:** add ^build dependency to check-types and test tasks, and add generate script to marketing ([72498a1](https://github.com/mgallagher56/flump/commit/72498a13492738b17667c3d9145d7f0f91f57909))
- **copy:** resolve all code review standards and spec findings ([00bb016](https://github.com/mgallagher56/flump/commit/00bb0161731edf09a3d4bf02ef552e1931af3433))
- **debt:** prevent metric card icon badges from overlapping title text ([a618ce1](https://github.com/mgallagher56/flump/commit/a618ce16428efd3b0f308bf5b567e2ac4b5c03e1))
- **deps:** pin dependencies ([b69b5ce](https://github.com/mgallagher56/flump/commit/b69b5cebf960dfa37f3176c5d1bce0a9f14c88be))
- **deps:** pin dependencies ([d5963a6](https://github.com/mgallagher56/flump/commit/d5963a680c465b63671523ce26ceb788ee341dad))
- **marketing:** add @testing-library/react and test dependencies ([3f763e2](https://github.com/mgallagher56/flump/commit/3f763e2d96422b854a3d665b46e88305603b20d6))
- **marketing:** ensure styled-system is generated in Docker build ([45f1af4](https://github.com/mgallagher56/flump/commit/45f1af42038dfbb0f5fa5beb22d9d4c2eb8ae9b4))
- **marketing:** resolve local app URL to localhost:5173 when running locally ([15577ab](https://github.com/mgallagher56/flump/commit/15577ab5e8fef6a70695ab9a68307c1f0da25c04))
- **marketing:** update hero copy, route buttons to web app, and add UK tool links ([70ab396](https://github.com/mgallagher56/flump/commit/70ab396c6b2d63855c792805de6e741ee5df2053))

### Build 🛠️

- **marketing:** alias @repo/ui/calculators path in vite config ([28f552b](https://github.com/mgallagher56/flump/commit/28f552ba183f6e57566c7beda92c064dfbaaaee3))

### Refactor 🔥

- **finance-engine:** collapse dual calculation engines and unify tax/debt math ([6c5fce0](https://github.com/mgallagher56/flump/commit/6c5fce0990cde6bc06410704f6d013b445392a9d))
- **state:** unify financial profile, baseline store, and seed hydration ([8d77149](https://github.com/mgallagher56/flump/commit/8d771498c8a4229ae87b97e30a2938de4b3096b6))
- **ui:** consolidate shared public calculators into @repo/ui ([96a328e](https://github.com/mgallagher56/flump/commit/96a328eddfe7d9ae21c117a89edfdd47ffdd1192))

### Miscellaneous 🙃

- **deps:** prune unused dependencies and align vitest versions ([e08b3bc](https://github.com/mgallagher56/flump/commit/e08b3bc4948ce28eb1f8efc25d243d8fa89db6c7))
- re-architect monorepo with bun, nestjs, react 19, and radix ([6e143b1](https://github.com/mgallagher56/flump/commit/6e143b19a7f307c88af390e3207f9f8f1285ae09))
- run lint and typescript checks and fix violations ([b5975fb](https://github.com/mgallagher56/flump/commit/b5975fb7d62aa7aa70aa281b43b11cdbf5d8d9c7))
- stop tracking environmental configurations and build artifacts ([6bd773a](https://github.com/mgallagher56/flump/commit/6bd773a1db81c0972c2afb07e9a18e8ebd2bb42a))
- **web:** release 1.20.0 ([1f2a83d](https://github.com/mgallagher56/flump/commit/1f2a83d1b3f1b2470283e3dc60bd627a7444f34e))
- **web:** release 1.21.0 ([a1a66d3](https://github.com/mgallagher56/flump/commit/a1a66d35611c46a5f98d6dac4e155dd219d42fd3))
- **web:** release 1.21.3 ([cba2855](https://github.com/mgallagher56/flump/commit/cba28559b66c1065b2e654d9e32d11eb463152eb))
