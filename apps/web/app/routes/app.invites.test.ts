// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => await vi.importActual("react-router"));
vi.mock("~/utils/auth.server", () => ({ getAuthSession: vi.fn() }));

import { getAuthSession } from "~/utils/auth.server";
import { action, loader } from "./app.invites";

const realFetch = globalThis.fetch;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
// Built at runtime so no token-shaped literal sits in the source.
const TOKEN = `${"t".repeat(40)}_-9`;

const post = (fields: Record<string, string>) => {
  const body = new URLSearchParams(fields);
  return action({
    request: new Request("http://internal:3000/app/invites", {
      method: "POST",
      body,
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "app.example" },
    }),
    params: {},
    context: {},
  } as never) as Promise<{ data: Record<string, unknown>; init: { status?: number } | null }>;
};

describe("/app/invites", () => {
  beforeEach(() => {
    vi.mocked(getAuthSession).mockResolvedValue({
      user: { id: "user_admin" },
      accessToken: "tok",
      headers: undefined,
    } as never);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.clearAllMocks();
  });

  it("shows anyone the backend does not treat as an admin the not-found page", async () => {
    globalThis.fetch = vi.fn(async () => json(404, { statusCode: 404 })) as typeof fetch;
    const thrown = await (
      loader({
        request: new Request("http://localhost/app/invites"),
        params: {},
        context: {},
      } as never) as Promise<unknown>
    ).catch((e: unknown) => e);
    expect(thrown).toMatchObject({ init: { status: 404 }, data: { kind: "not-found" } });
  });

  it("loads the invites and the people with access for an admin", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith("/invites") ? json(200, { invites: [] }) : json(200, { members: [] }),
    ) as typeof fetch;
    const result = (await loader({
      request: new Request("http://localhost/app/invites"),
      params: {},
      context: {},
    } as never)) as { data: unknown };
    expect(result.data).toEqual({ invites: [], members: [] });
  });

  it("creates a link on the address the admin is using, never storing the token", async () => {
    globalThis.fetch = vi.fn(async () =>
      json(201, {
        id: "00000000-0000-4000-8000-000000000001",
        token: TOKEN,
        label: "Sam",
        createdAt: "2026-11-20T09:00:00.000Z",
        expiresAt: "2026-12-04T09:00:00.000Z",
      }),
    ) as typeof fetch;
    const result = await post({ intent: "create", label: "  Sam " });
    expect(result.data).toEqual({
      intent: "create",
      link: `https://app.example/invite/${TOKEN}`,
      expiresAt: "2026-12-04T09:00:00.000Z",
      label: "Sam",
    });
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ label: "Sam" });
    expect(new Headers(init.headers).has("Idempotency-Key")).toBe(false);
  });

  it("refuses a label over 60 characters without calling the backend", async () => {
    globalThis.fetch = vi.fn() as typeof fetch;
    const result = await post({ intent: "create", label: "x".repeat(61) });
    expect(result.init?.status).toBe(400);
    expect(result.data).toMatchObject({ success: false });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([
    [
      "cancel",
      "00000000-0000-4000-8000-000000000001",
      "/v1/beta/admin/invites/00000000-0000-4000-8000-000000000001",
    ],
    ["remove", "user_sam", "/v1/beta/admin/members/user_sam"],
  ])("%s sends one DELETE for that item", async (intent, id, path) => {
    globalThis.fetch = vi.fn(async () => json(200, { success: true })) as typeof fetch;
    const result = await post({ intent, id });
    expect(result.data).toEqual({ intent, success: true });
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    expect(String(url).endsWith(path)).toBe(true);
    expect(init.method).toBe("DELETE");
  });
});
