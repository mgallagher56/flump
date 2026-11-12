import { expect, test } from "bun:test";
import {
  assertEnvelopeClean,
  runEnvelopeScenario,
} from "../../apps/backend/test/support/sentry-envelope";

// Proves the Sentry SDK transport and exception filter under Bun (the production runtime).
test("Sentry envelope under Bun carries the exception and no sentinels", async () => {
  const result = await runEnvelopeScenario();
  expect(() => assertEnvelopeClean(result)).not.toThrow();
}, 30_000);
