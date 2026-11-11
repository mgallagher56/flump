# Changelog

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
