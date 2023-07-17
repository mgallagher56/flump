<h1>flump</h1>

Finance dashboard project based on [Remix JS](https://remix.run/) Blues stack using:

- [supabase](https://supabase.io/) - postgresql database
- [vite](https://vitejs.dev/) - build tool
- [vitest](https://vitest.dev/) - unit/integration testing
- [cypress](https://www.cypress.io/) - e2e testing
- [eslint](https://eslint.org/) - linting
- [prettier](https://prettier.io/) - formatting
- [fly.io](https://fly.io/) - hosting
- [github actions](https://docs.github.com/en/actions) - ci/cd
- [starlight](https://starlight.astro.build/) - documentation

## Development

- Install [Node.js](https://nodejs.org/en/) and [pnpm](https://pnpm.io/).
- Set up supabase locally [docs](https://supabase.io/docs/guides/local-development)

  - [Docker Desktop](https://docs.docker.com/desktop/)
  - [Supabase CLI](https://supabase.com/docs/guides/cli)
  - [Git](https://github.com/git-guides/install-git)

- Run the `remix.init` script and commit the changes it makes to your project.

  ```sh
  npx remix init
  git init # if you haven't already
  git add .
  git commit -m "Initialize project"
  ```

- Login to supabase

  ```sh
  supabase login
  ```

- Start Supabase services
  Initialize Supabase to set up the configuration for developing your project locally:

```sh
supabase init
```

- Make sure Docker is running. The start command uses Docker to start the Supabase services.
  This command may take a while to run if this is the first time using the CLI.

```sh
supabase start
```

Once all of the Supabase services are running, you'll see output containing your local Supabase credentials. It should look like this, with urls and keys that you'll use in your local project:

- create .env file

  ```sh
  mkdir .env
  ```

- add local supabase url and anon_key to .env file

  ```sh
  SUPABASE_URL="http://localhost:54321"
  SUPABASE_ANON_KEY="your anon key"
  ```

- apply migrations

  ```sh
  supabase db start
  ```

- Run the first build:

  ```sh
  pnpm run build
  ```

- Start dev server:

  ```sh
  pnpm run dev
  ```

This starts your app in development mode, rebuilding assets on file changes.

<h2>Scripts</h2>
<ul>
   <li><code>build</code>: Runs the <code>build:*</code> scripts concurrently.</li>
   <li><code>build:remix</code>: Builds the remix project.</li>
   <li><code>build:server</code>: Bundles the <code>server.ts</code> file using esbuild.</li>
   <li><code>commit</code>: Runs <code>git-cz</code> for committing changes.</li>
   <li><code>dev</code>: Runs the <code>dev:*</code> scripts concurrently.</li>
   <li><code>dev:build</code>: Builds the server in development mode and watches for changes.</li>
   <li><code>dev:remix</code>: Runs the remix project in development mode and watches for changes.</li>
   <li><code>dev:server</code>: Runs the built server in development mode with Node.js inspector and required modules.</li>
   <li><code>docker</code>: Starts the Docker containers using <code>docker-compose</code>.</li>
   <li><code>format</code>: Formats the code using Prettier.</li>
   <li><code>lint</code>: Lints the code using ESLint with auto-fixing, caching, and a specified cache location.</li>
   <li><code>lint:staged</code>: Runs linting on staged files using the timezone UTC.</li>
   <li><code>start</code>: Starts the server in production mode.</li>
   <li><code>start:mocks</code>: Starts the server in production mode with mocks.</li>
   <li><code>supabase:start</code>: Starts the Supabase server.</li>
   <li><code>supabase:stop</code>: Stops the Supabase server.</li>
   <li><code>test</code>: Runs the tests using <code>vitest</code>.</li>
   <li><code>test:ui</code>: Runs the tests with the UI using <code>vitest</code>.</li>
   <li><code>test:preview</code>: Creates a preview of the tests using <code>vite</code>.</li>
   <li><code>test:e2e:dev</code>: Starts the server in development mode and runs Cypress tests.</li>
   <li><code>pretest:e2e:run</code>: Runs the build before running the end-to-end tests.</li>
   <li><code>test:e2e:run</code>: Starts the server with mocks and runs Cypress end-to-end tests.</li>
   <li><code>ts-coverage</code>: Generates a TypeScript coverage report with strict settings.</li>
   <li><code>ts-coverage:ui</code>: Generates a TypeScript coverage report and creates a preview using <code>vite</code>.</li>
   <li><code>validate</code>: Runs multiple tasks including tests, linting, type checking, and running end-to-end tests.</li>
</ul>
<h2>Dependencies</h2>
<ul>
   <li><strong>@chakra-ui/react</strong>: React UI component library with Chakra UI styling.</li>
   <li><strong>@emotion/cache</strong>: Cache package for Emotion CSS-in-JS library.</li>
   <li><strong>@emotion/react</strong>: React bindings for the Emotion CSS-in-JS library.</li>
   <li><strong>@emotion/server</strong>: Server-side rendering support for Emotion CSS-in-JS library.</li>
   <li><strong>@emotion/styled</strong>: Styled component support for Emotion CSS-in-JS library.</li>
   <li><strong>@isaacs/express-prometheus-middleware</strong>: Prometheus middleware for Express.js to collect and expose metrics.</li>
   <li><strong>@remix-run/css-bundle</strong>: CSS bundling package for Remix Run framework.</li>
   <li><strong>@remix-run/express</strong>: Express.js integration for Remix Run framework.</li>
   <li><strong>@remix-run/node</strong>: Node.js runtime for Remix Run framework.</li>
   <li><strong>@remix-run/react</strong>: React bindings for Remix Run framework.</li>
   <li><strong>@remix-run/server-runtime</strong>: Server runtime for Remix Run framework.</li>
   <li><strong>@supabase/auth-helpers-remix</strong>: Remix-specific authentication helpers for Supabase.</li>
   <li><strong>@supabase/supabase-js</strong>: JavaScript client library for Supabase.</li>
   <li><strong>@zag-js/pressable</strong>: Pressable component for handling mouse and touch interactions.</li>
   <li><strong>@zag-js/react</strong>: React components for Zag UI library.</li>
   <li><strong>@zag-js/tabs</strong>: Tab component for managing tabbed content.</li>
   <li><strong>bcryptjs</strong>: Library for hashing passwords using bcrypt algorithm.</li>
   <li><strong>compression</strong>: Compression middleware for Express.js.</li>
   <li><strong>cross-env</strong>: Cross-platform environment variable setting package.</li>
   <li><strong>express</strong>: Fast and minimalist web framework for Node.js.</li>
   <li><strong>framer-motion</strong>: Animation library for React.</li>
   <li><strong>isbot</strong>: Package for detecting bots based on user agent.</li>
   <li><strong>morgan</strong>: HTTP request logger middleware for Node.js.</li>
   <li><strong>prom-client</strong>: Prometheus client library for Node.js.</li>
   <li><strong>react</strong>: JavaScript library for building user interfaces.</li>
   <li><strong>react-dom</strong>: React package for DOM rendering.</li>
   <li><strong>supabase</strong>: Open-source alternative to Firebase for building realtime and collaborative applications.</li>
   <li><strong>tiny-invariant</strong>: Tiny utility for handling invariants.</li>
</ul>
<h2>Dev Dependencies</h2>
<ul>
   <li><strong>@commitlint/cli</strong>: Linting tool for commit messages.</li>
   <li><strong>@commitlint/config-conventional</strong>: Commitlint configuration following conventional commits.</li>
   <li><strong>@faker-js/faker</strong>: Library for generating fake data.</li>
   <li><strong>@remix-run/dev</strong>: Development server for Remix Run framework.</li>
   <li><strong>@remix-run/eslint-config</strong>: ESLint configuration for Remix Run framework.</li>
   <li><strong>@testing-library/cypress</strong>: Cypress testing library for Cypress.io.</li>
   <li><strong>@testing-library/jest-dom</strong>: Custom DOM matchers for Jest.</li>
   <li><strong>@testing-library/react</strong>: Testing utilities for React components.</li>
   <li><strong>@testing-library/user-event</strong>: User events simulation library for testing.</li>
   <li><strong>@trivago/prettier-plugin-sort-imports</strong>: Prettier plugin for sorting imports.</li>
   <li><strong>@types/bcryptjs</strong>: TypeScript typings for bcryptjs.</li>
   <li><strong>@types/compression</strong>: TypeScript typings for compression.</li>
   <li><strong>@types/eslint</strong>: TypeScript typings for ESLint.</li>
   <li><strong>@types/express</strong>: TypeScript typings for Express.js.</li>
   <li><strong>@types/morgan</strong>: TypeScript typings for Morgan HTTP request logger.</li>
   <li><strong>@types/node</strong>: TypeScript typings for Node.js.</li>
   <li><strong>@types/react</strong>: TypeScript typings for React.</li>
   <li><strong>@types/react-dom</strong>: TypeScript typings for React DOM.</li>
   <li><strong>@typescript-eslint/eslint-plugin</strong>: ESLint plugin for TypeScript.</li>
   <li><strong>@typescript-eslint/parser</strong>: Parser for TypeScript ESLint.</li>
   <li><strong>@vitejs/plugin-react</strong>: React plugin for Vite bundler.</li>
   <li><strong>@vitest/browser</strong>: Headless browser runner for vitest.</li>
   <li><strong>@vitest/coverage-c8</strong>: Coverage reporter for vitest using c8.</li>
   <li><strong>@vitest/coverage-v8</strong>: Coverage reporter for vitest using V8.</li>
   <li><strong>@vitest/ui</strong>: UI for vitest test runner.</li>
   <li><strong>autoprefixer</strong>: PostCSS plugin to parse CSS and add vendor prefixes.</li>
   <li><strong>c8</strong>: Code coverage tool for Node.js using V8 coverage API.</li>
   <li><strong>cookie</strong>: HTTP cookie parsing and serialization for Node.js.</li>
   <li><strong>cypress</strong>: JavaScript end-to-end testing framework.</li>
   <li><strong>dotenv</strong>: Environment variable loader for Node.js.</li>
   <li><strong>esbuild</strong>: JavaScript bundler and minifier.</li>
   <li><strong>eslint</strong>: Pluggable JavaScript linter.</li>
   <li><strong>eslint-config-prettier</strong>: ESLint configuration to disable conflicting Prettier rules.</li>
   <li><strong>eslint-config-react-app</strong>: ESLint configuration for React applications.</li>
   <li><strong>eslint-plugin-cypress</strong>: ESLint plugin for Cypress.io.</li>
   <li><strong>eslint-plugin-no-relative-import-paths</strong>: ESLint plugin to disallow relative import paths.</li>
   <li><strong>eslint-plugin-sonarjs</strong>: ESLint plugin that provides rules from SonarJS.</li>
   <li><strong>happy-dom</strong>: In-memory DOM implementation for testing.</li>
   <li><strong>husky</strong>: Git hooks made easy.</li>
   <li><strong>install</strong>: CLI tool to install packages.</li>
   <li><strong>lint-staged</strong>: Run linters on Git staged files.</li>
   <li><strong>msw</strong>: Library for mocking HTTP requests in tests.</li>
   <li><strong>npm-run-all</strong>: CLI tool to run multiple npm scripts sequentially or in parallel.</li>
   <li><strong>postcss</strong>: Tool for transforming CSS with JavaScript.</li>
   <li><strong>prettier</strong>: Opinionated code formatter.</li>
   <li><strong>start-server-and-test</strong>: CLI tool to start server and run tests against it.</li>
   <li><strong>ts-node</strong>: TypeScript execution and REPL for Node.js.</li>
   <li><strong>tsc-files</strong>: TypeScript checker for changed files.</li>
   <li><strong>tsconfig-paths</strong>: Load modules using tsconfig.json paths.</li>
   <li><strong>type-coverage</strong>: Static analysis tool to check TypeScript code coverage.</li>
   <li><strong>typescript</strong>: Typed superset of JavaScript.</li>
   <li><strong>typescript-coverage-report</strong>: Generate code coverage reports for TypeScript projects.</li>
   <li><strong>vite</strong>: Fast development server and bundler.</li>
   <li><strong>vite-plugin-checker</strong>: Vite plugin for running TypeScript and ESLint checks.</li>
   <li><strong>vite-tsconfig-paths</strong>: Vite plugin for resolving TypeScript paths.</li>
   <li><strong>vitest</strong>: Test runner for Vite and Vue.</li>
   <li><strong>vitest-github-actions-reporter</strong>: GitHub Actions reporter for vitest.</li>
   <li><strong>vitest-sonar-reporter</strong>: SonarQube reporter for vitest.</li>
   <li><strong>webdriverio</strong>: Next-gen browser and mobile automation framework.</li>
</ul>
