<h1>flump</h1>

Finance dashboard project based on [Remix JS](https://remix.run/) Blues stack using:

- [supabase](https://supabase.io/) - postgresql database
- [vite](https://vitejs.dev/) - build tool
- [vitest](https://vitest.dev/) - unit/integration testing
- [eslint](https://eslint.org/) - linting
- [prettier](https://prettier.io/) - formatting
- [fly.io](https://fly.io/) - hosting
- [github actions](https://docs.github.com/en/actions) - ci/cd

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
