# The data door (`src/data`)

The one place in the app that talks to the Flump API (plan section 4.6, O5 seam 2). Screens and features reach data only through what this folder exports: the `@flump/api-client` instance (`apiClient.ts`), the account check (`account.ts`) and the WorkOS token calls (`workos.ts`). Since S3 it also holds the query client and the one query key factory (`queryClient.ts`, `queryKeys.ts`), `ApiProvider` (hands the client to screens and drops the cache when nobody is signed in), the check-in's reads and save (`checkIn.ts`), the delayed loading timer and `problems.ts` (what went wrong, in the kinds a screen acts on). `fakeApi.tsx` is for tests only.

Biome enforces it (`biome.json`, the `apps/mobile` overrides): outside this folder, importing `@flump/api-client` or calling `fetch` is a lint error. Keeping every request behind one door is what keeps an opt-in encrypted mode possible later.

Sign-in (S2a) is the first user: `src/auth` gets these through `authDeps.ts` and never calls `fetch` itself.
