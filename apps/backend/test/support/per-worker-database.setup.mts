// Setup file for the "db" Vitest project (vitest.config.ts): each worker gets its own database
// before any spec in it is collected (src/testing/perWorkerDatabase.ts). An .mts file so the
// top-level await runs before collection.
import { setUpWorkerDatabase } from "../../src/testing/perWorkerDatabase.js";

await setUpWorkerDatabase();
