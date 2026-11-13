import { expect, test } from "bun:test";
import { existsSync } from "node:fs";

// The backend resolves @flump/observability from its built dist, and the helper below
// imports the backend at module load. Jobs that run `bun test ./scripts` before building
// workspace packages (the Lint job) therefore skip this test and must not import the
// helper statically; the Vitest job builds first, so the check still runs in CI.
const observabilityBuilt = existsSync(
  new URL("../../packages/observability/dist/index.js", import.meta.url),
);

// Proves the Sentry SDK transport and exception filter under Bun (the production runtime).
test.skipIf(!observabilityBuilt)(
  "Sentry envelope under Bun carries the exception and no sentinels",
  async () => {
    const {
      assertEnvelopeClean,
      assertNestLoggerRestored,
      assertNoLeakedKeys,
      runEnvelopeScenario,
      runUnhardenedEnvelope,
    } = await import("../../apps/backend/test/support/sentry-envelope");
    const result = await runEnvelopeScenario();
    expect(() => assertEnvelopeClean(result)).not.toThrow();
    // Positive control: the same key assertion must fire on an unhardened SDK envelope.
    const unhardened = await runUnhardenedEnvelope();
    expect(() => assertNoLeakedKeys(unhardened)).toThrow(/envelope contains/);
    // The scenario boots a Nest app with logger:false; later test files in this process must still see Nest logs.
    expect(() => assertNestLoggerRestored()).not.toThrow();
  },
  30_000,
);
