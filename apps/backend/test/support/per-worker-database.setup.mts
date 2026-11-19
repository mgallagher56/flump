// Setup file for the "db" Vitest project (vitest.config.ts): each worker gets its own database
// before any spec in it is collected (test/support/perWorkerDatabase.ts). Vitest runs setup files
// before it imports each spec, so specs that read the URL at collection see the worker's own. An
// .mts file so the top-level await is valid under this package's CommonJS TypeScript settings.
import { setUpWorkerDatabase } from "./perWorkerDatabase.js";

await setUpWorkerDatabase();
