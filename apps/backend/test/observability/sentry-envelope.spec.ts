import { describe, expect, it } from "vitest";
import { assertEnvelopeClean, runEnvelopeScenario } from "../support/sentry-envelope";

describe("Sentry envelope (real SDK, local sink)", () => {
  it("delivers the exception without sentinels, body, headers or query", async () => {
    const result = await runEnvelopeScenario();
    assertEnvelopeClean(result);
    expect(result.envelopes.join("")).toContain('"tags":{"request_id":"req-envelope-1"}');
  });

  it("sends the self-test message when asked", async () => {
    const result = await runEnvelopeScenario({ SENTRY_SELFTEST_ON_BOOT: "1" });
    expect(result.envelopes.join("")).toContain("sentry self-test");
  });
});
