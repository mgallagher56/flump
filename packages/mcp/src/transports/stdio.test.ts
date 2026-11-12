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
    ).rejects.toThrow(/Could not reach Flump API at/);
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

  it("rejects on timeout, passes an abort signal and never connects", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      throw new DOMException("The operation timed out", "TimeoutError");
    });
    const connect = vi.fn();
    await expect(
      runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
    ).rejects.toThrow(/Could not reach Flump API/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("rejects a 200 response with a non-JSON body", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>oops</html>", { status: 200 }));
    const connect = vi.fn();
    await expect(
      runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
    ).rejects.toThrow(/not valid JSON/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("rejects a response with no baseline.userId", async () => {
    const fetchImpl = vi.fn(async () => json({ baseline: {} }));
    const connect = vi.fn();
    await expect(
      runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
    ).rejects.toThrow(PatRejectedError);
    expect(connect).not.toHaveBeenCalled();
  });

  it("never includes the PAT in thrown errors", async () => {
    const failures: Array<typeof fetch> = [
      (async () => {
        throw new Error(`boom ${PAT}`);
      }) as unknown as typeof fetch,
      (async () => json({}, 401)) as unknown as typeof fetch,
      (async () => new Response("nope", { status: 200 })) as unknown as typeof fetch,
      (async () => json({ baseline: {} })) as unknown as typeof fetch,
    ];
    for (const fetchImpl of failures) {
      const err = await runStdio({ FLUMP_PAT: PAT }, fetchImpl, vi.fn()).catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(String(err.message)).not.toContain(PAT);
    }
  });
});
