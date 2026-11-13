import { describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/client.js";
import { renterWithUnknownAprCard } from "../testing/personas.js";

describe("uk advisor prompts (E17-N4)", () => {
  it("do not embed the salary", async () => {
    const h = await connectTestClient(renterWithUnknownAprCard);
    for (const name of [
      "uk-financial-health-audit",
      "escape-100k-tax-trap",
      "crush-high-apr-debt",
    ]) {
      const res = await h.client.getPrompt({ name });
      expect(JSON.stringify(res.messages)).not.toMatch(/38,000|38000/);
    }
    await h.close();
  });

  it("escape-100k-tax-trap does not read user data", async () => {
    const h = await connectTestClient(renterWithUnknownAprCard);
    await h.client.getPrompt({ name: "escape-100k-tax-trap" });
    expect(h.provider.calls).toEqual([]);
    await h.close();
  });
});
