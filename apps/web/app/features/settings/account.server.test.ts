// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "~/services/backend-error";

// Actions need the real `data` and `redirectDocument`; the global setup stubs parts of react-router.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const getAuthSession = vi.fn();
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: (...a: unknown[]) => getAuthSession(...a),
  requireAccessToken: ({ accessToken }: { accessToken?: string }) => accessToken,
}));
const backendFetch = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetch: (...a: unknown[]) => backendFetch(...a),
}));

import { apiConfig } from "~/config.server";
import { action, shouldRevalidate } from "~/routes/app.profile";
import { DELETE_TIMEOUT_MS, exportAccountData } from "./account.server";

type DataResult = { data: unknown; init: { status?: number } | null };

const deleteRequest = (fields: Record<string, string>, url = "http://localhost/app/profile") =>
  action({
    request: new Request(url, { method: "POST", body: new URLSearchParams(fields) }),
    params: {},
    context: {},
  } as never) as Promise<Response | DataResult>;

const confirmFields = { intent: "delete-account", confirmation: "DELETE" };

describe("settings route action: delete account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({ accessToken: "tok", user: { id: "u1" } });
  });

  it("calls the backend with the contract body", async () => {
    backendFetch.mockResolvedValue({ status: "identity_pending" });
    await deleteRequest(confirmFields);
    expect(backendFetch).toHaveBeenCalledWith(
      "/user-profile",
      expect.objectContaining({
        accessToken: "tok",
        method: "DELETE",
        body: { confirmation: "DELETE" },
        timeoutMs: DELETE_TIMEOUT_MS,
      }),
    );
  });

  it("on deleted, clears the session cookies and reloads the signed-out page", async () => {
    backendFetch.mockResolvedValue({ status: "deleted" });
    const res = (await deleteRequest(confirmFields, "https://app.example/app/profile")) as Response;
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/account-deleted");
    expect(res.headers.get("X-Remix-Reload-Document")).toBe("true");
    const cookies = res.headers.getSetCookie();
    const sessionClear = cookies.find(
      (c) => !c.startsWith("flump_has_session") && /session=;/.test(c),
    );
    expect(sessionClear).toContain("Max-Age=0");
    expect(cookies).toContain("flump_has_session=; Path=/; SameSite=Lax; Max-Age=0; Secure");
  });

  it("returns identity_pending so the dialog can offer a retry", async () => {
    backendFetch.mockResolvedValue({ status: "identity_pending" });
    const res = (await deleteRequest(confirmFields)) as DataResult;
    expect(res.data).toEqual({ outcome: "identity_pending" });
    expect(res.init?.status).toBe(200);
  });

  it("maps a 429 to rate_limited", async () => {
    backendFetch.mockRejectedValue(new BackendError("client", "/user-profile", 429));
    const res = (await deleteRequest(confirmFields)) as DataResult;
    expect(res.data).toEqual({ outcome: "rate_limited" });
    expect(res.init?.status).toBe(429);
  });

  it("maps the recent-login 403 to recent_login_required", async () => {
    backendFetch.mockRejectedValue(new BackendError("forbidden", "/user-profile", 403));
    const res = (await deleteRequest(confirmFields)) as DataResult;
    expect(res.data).toEqual({ outcome: "recent_login_required" });
    expect(res.init?.status).toBe(403);
  });

  it("shows the generic failure when deletion is unavailable (503)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    backendFetch.mockRejectedValue(new BackendError("server", "/user-profile", 503));
    const res = (await deleteRequest(confirmFields)) as DataResult;
    expect(res.data).toEqual({ outcome: "failed" });
  });

  it("maps any other backend failure to a generic failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    backendFetch.mockRejectedValue(new BackendError("server", "/user-profile", 500));
    const res = (await deleteRequest(confirmFields)) as DataResult;
    expect(res.data).toEqual({ outcome: "failed" });
    expect(res.init?.status).toBe(502);
  });

  it("treats an unexpected response as a failure, never as deleted", async () => {
    backendFetch.mockResolvedValue({ status: "something-else" });
    const res = (await deleteRequest(confirmFields)) as DataResult;
    expect(res.data).toEqual({ outcome: "failed" });
  });

  it("refuses without the confirmation phrase and never calls the backend", async () => {
    const res = (await deleteRequest({ intent: "delete-account", confirmation: "delete" })) as
      | DataResult
      | Response;
    expect((res as DataResult).data).toEqual({ outcome: "failed" });
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("rejects an unknown intent", async () => {
    const res = (await deleteRequest({ intent: "something" })) as DataResult;
    expect(res.init?.status).toBe(400);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("does not reload the profile after a delete attempt", () => {
    const formData = new FormData();
    formData.set("intent", "delete-account");
    expect(shouldRevalidate({ formData, defaultShouldRevalidate: true } as never)).toBe(false);
    expect(shouldRevalidate({ defaultShouldRevalidate: true } as never)).toBe(true);
  });
});

describe("export route", () => {
  const exportRequest = (headers: Record<string, string> = { "X-Flump-Request": "1" }) =>
    ({
      request: new Request("http://localhost/account/export", { headers }),
      params: {},
      context: {},
    }) as never;

  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({ accessToken: "tok", user: { id: "u1" } });
  });

  it("streams the backend body through with download and no-store headers", async () => {
    let pull = 0;
    const upstreamBody = new ReadableStream<Uint8Array>({
      pull(controller) {
        pull += 1;
        if (pull === 1) controller.enqueue(new TextEncoder().encode('{"profile":'));
        else if (pull === 2) controller.enqueue(new TextEncoder().encode("{}}"));
        else controller.close();
      },
    });
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(upstreamBody, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="flump-export-2026-11-14.json"',
        },
      }),
    );

    const res = await exportAccountData(exportRequest(), { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      `${apiConfig.apiBaseUrl}/user-profile/export`,
      expect.objectContaining({ method: "GET", headers: { Authorization: "Bearer tok" } }),
    );
    expect(res.status).toBe(200);
    // The same stream object is handed on, not a buffered copy.
    expect(res.body).toBe(upstreamBody);
    expect(pull).toBeLessThanOrEqual(1);
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="flump-export-2026-11-14.json"',
    );
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await res.text()).toBe('{"profile":{}}');
  });

  it("falls back to a dated filename when the backend name is unexpected", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("{}", {
        status: 200,
        headers: { "Content-Disposition": 'attachment; filename="../evil.sh"' },
      }),
    );
    const res = await exportAccountData(exportRequest(), {
      fetchImpl,
      now: () => new Date("2026-11-14T10:00:00Z"),
    });
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="flump-export-2026-11-14.json"',
    );
  });

  it("refuses requests without the same-origin header", async () => {
    const fetchImpl = vi.fn();
    const res = await exportAccountData(exportRequest({}), { fetchImpl });
    expect(res.status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses cross-site requests", async () => {
    const fetchImpl = vi.fn();
    const res = await exportAccountData(
      exportRequest({ "X-Flump-Request": "1", "Sec-Fetch-Site": "cross-site" }),
      { fetchImpl },
    );
    expect(res.status).toBe(403);
  });

  it("returns 401 when signed out", async () => {
    getAuthSession.mockResolvedValue({ accessToken: null, user: null });
    const fetchImpl = vi.fn();
    const res = await exportAccountData(exportRequest(), { fetchImpl });
    expect(res.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("passes a rate limit on and hides other backend failures", async () => {
    const limited = await exportAccountData(exportRequest(), {
      fetchImpl: vi.fn().mockResolvedValue(new Response("{}", { status: 429 })),
    });
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "rate_limited" });

    const broken = await exportAccountData(exportRequest(), {
      fetchImpl: vi.fn().mockResolvedValue(new Response("secret stack", { status: 500 })),
    });
    expect(broken.status).toBe(502);
    expect(await broken.text()).not.toContain("secret");
    expect(broken.headers.get("Cache-Control")).toBe("private, no-store");

    const down = await exportAccountData(exportRequest(), {
      fetchImpl: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    });
    expect(down.status).toBe(503);
  });
});
