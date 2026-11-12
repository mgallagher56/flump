import { describe, expect, it, vi } from "vitest";
import { PAT_REJECTED_MESSAGE, PatRejectedError, runStdio } from "./stdio.js";

const PAT = "flump_pat_0123456789abcdef0123456789abcdef";

const okPack = {
  baseline: { userId: "user-1" },
  portfolio: { accounts: [] },
  budgetSummary: { entries: [] },
  taxRecords: [],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("runStdio", () => {
  it("rejects a missing FLUMP_PAT without calling the API", async () => {
    const fetchImpl = vi.fn();
    await expect(runStdio({}, fetchImpl as unknown as typeof fetch)).rejects.toThrow(
      PatRejectedError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(PAT_REJECTED_MESSAGE).toBe("PAT rejected: create one in Flump, AI connections");
  });

  for (const status of [401, 403, 404, 500]) {
    it(`rejects a ${status} response and connects nothing`, async () => {
      const fetchImpl = vi.fn(async () => json({}, status));
      const connect = vi.fn();
      await expect(
        runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
      ).rejects.toThrow(PatRejectedError);
      expect(connect).not.toHaveBeenCalled();
    });
  }

  it("rejects when the API is unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const connect = vi.fn();
    await expect(
      runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
    ).rejects.toThrow(/ECONNREFUSED/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("sends the PAT as a bearer token and connects on 2xx", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => json(okPack));
    const connect = vi.fn();
    await runStdio(
      { FLUMP_PAT: PAT, FLUMP_API_URL: "https://api.example.test" },
      fetchImpl as unknown as typeof fetch,
      connect,
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/mcp-tokens/context-pack",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${PAT}` }),
      }),
    );
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
