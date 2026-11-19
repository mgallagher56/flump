import { mergeConfig } from "vitest/config";
import base from "./vitest.config";

// Mutation runs (stryker.config.json) keep each test file isolated. The ordinary run shares one
// module graph per worker (vitest.config.ts, E41 P4), but under Stryker a fault in module-level
// code must be loaded again for each test file, and the mutation scores and floors (E41 M1) were
// measured with isolation on. So Stryker's run is unchanged by P4.
export default mergeConfig(base, { test: { isolate: true } });
