# The data door (`src/data`)

The one place in the app that talks to the Flump API (plan section 4.6, O5 seam 2). Screens and features reach data only through what this folder exports: the `@flump/api-client` instance (`apiClient.ts`), the account check (`account.ts`) and the WorkOS token calls (`workos.ts`). The query key factory comes with the first screen that reads data.

Biome enforces it (`biome.json`, the `apps/mobile` overrides): outside this folder, importing `@flump/api-client` or calling `fetch` is a lint error. Keeping every request behind one door is what keeps an opt-in encrypted mode possible later.

Sign-in (S2a) is the first user: `src/auth` gets these through `authDeps.ts` and never calls `fetch` itself.
