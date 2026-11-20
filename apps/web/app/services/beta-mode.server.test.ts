// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isInviteOnly, resetBetaModeCache } from "./beta-mode.server";

const realFetch = globalThis.fetch;
const answer = (body: unknown, status = 200) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  ) as unknown as typeof fetch;

describe("isInviteOnly", () => {
  beforeEach(() => resetBetaModeCache());
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("reads the public flag from GET /v1/app/beta with no credentials", async () => {
    globalThis.fetch = answer({ inviteOnly: false });
    expect(await isInviteOnly(0)).toBe(false);
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    expect(String(url)).toMatch(/\/v1\/app\/beta$/);
    expect(JSON.stringify(init?.headers ?? {})).not.toMatch(/authorization/i);
  });

  it("keeps an answer for a minute, then asks again", async () => {
    globalThis.fetch = answer({ inviteOnly: true });
    expect(await isInviteOnly(0)).toBe(true);
    expect(await isInviteOnly(59_999)).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
    globalThis.fetch = answer({ inviteOnly: false });
    expect(await isInviteOnly(60_000)).toBe(false);
  });

  it("answers invite-only when the backend fails, and asks again after ten seconds", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("down")) as unknown as typeof fetch;
    expect(await isInviteOnly(0)).toBe(true);
    globalThis.fetch = answer({ inviteOnly: false });
    expect(await isInviteOnly(9_999)).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(await isInviteOnly(10_000)).toBe(false);
  });

  it("answers invite-only for a body off contract", async () => {
    globalThis.fetch = answer({ inviteOnly: "no" });
    expect(await isInviteOnly(0)).toBe(true);
  });

  it("shares one read between concurrent callers", async () => {
    globalThis.fetch = answer({ inviteOnly: false });
    const answers = await Promise.all([isInviteOnly(0), isInviteOnly(0), isInviteOnly(0)]);
    expect(answers).toEqual([false, false, false]);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });
});
