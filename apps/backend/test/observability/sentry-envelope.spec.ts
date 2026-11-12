import { describe, expect, it } from "vitest";
import { assertEnvelopeClean, runEnvelopeScenario } from "../support/sentry-envelope";

describe("Sentry envelope (real SDK, local sink)", () => {
  it("delivers the exception without sentinels, body, headers, query, cookies or user", async () => {
    const result = await runEnvelopeScenario();
    assertEnvelopeClean(result);
    expect(result.envelopes.join("")).toContain('"tags":{"request_id":"req-envelope-1"}');
  });

  it("withholds a provider-style message", async () => {
    const result = await runEnvelopeScenario({}, "provider");
    assertEnvelopeClean(result);
  });

  it("sends nothing for a 4xx HttpException", async () => {
    const result = await runEnvelopeScenario({}, "bad");
    expect(result.status).toBe(400);
    expect(result.envelopes).toEqual([]);
  });

  it("sends the self-test message when asked", async () => {
    const result = await runEnvelopeScenario({ SENTRY_SELFTEST_ON_BOOT: "1" });
    expect(result.envelopes.join("")).toContain("sentry self-test");
  });
});
