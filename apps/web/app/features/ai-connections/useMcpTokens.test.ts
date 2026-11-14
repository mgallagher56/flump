import {
  ContextPackResponse,
  CreateMcpTokenResponse,
  McpTokenListResponse,
  RevokeMcpTokenResponse,
} from "@flump/api-contract";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "~/services/backend-error";

const apiFetch = vi.fn();
// One mock for both: the list goes through apiFetchAll (it follows X-Next-Cursor).
vi.mock("~/services/api-client", () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
  apiFetchAll: (...a: unknown[]) => apiFetch(...a),
}));

const { useMcpTokens, TOKENS_UNAVAILABLE, CREATE_FAILED, RATE_LIMITED, REVOKE_FAILED } =
  await import("./useMcpTokens");

describe("useMcpTokens", () => {
  beforeEach(() => apiFetch.mockReset());

  it("loads the saved tokens, and treats a failed load as none", async () => {
    apiFetch.mockResolvedValueOnce([{ id: "t1" }]);
    const { result } = renderHook(() => useMcpTokens());
    expect(result.current.tokens).toBeNull();
    await waitFor(() =>
      expect(result.current.tokens).toEqual([{ id: "t1", expiresAt: null, lastUsedAt: null }]),
    );
    expect(apiFetch).toHaveBeenCalledWith("/mcp-tokens", {
      signal: expect.any(AbortSignal),
      schema: McpTokenListResponse,
    });

    apiFetch.mockRejectedValueOnce(new BackendError("server", "/mcp-tokens", 500));
    const failed = renderHook(() => useMcpTokens());
    await waitFor(() => expect(failed.result.current.tokens).toEqual([]));
  });

  it("creates with the staging opt-in in the body", async () => {
    apiFetch.mockResolvedValueOnce([]).mockResolvedValueOnce({ id: "t2" });
    const { result } = renderHook(() => useMcpTokens());
    await act(async () => {
      await result.current.create("Claude", true, 30, true);
    });
    expect(apiFetch).toHaveBeenLastCalledWith("/mcp-tokens", {
      method: "POST",
      schema: CreateMcpTokenResponse,
      body: { name: "Claude", expiryDays: 30, anonymizeInstitutions: true, allowStaging: true },
    });
  });

  it("turns failures into safe messages", async () => {
    apiFetch.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useMcpTokens());
    apiFetch.mockRejectedValueOnce(new BackendError("not-found", "/mcp-tokens", 404));
    await expect(result.current.create("a", true, 90, false)).rejects.toThrow(TOKENS_UNAVAILABLE);
    apiFetch.mockRejectedValueOnce(new BackendError("client", "/mcp-tokens", 429));
    await expect(result.current.create("a", true, 90, false)).rejects.toThrow(RATE_LIMITED);
    // A 5xx leaves the outcome unknown, so the list is read again (covered below).
    apiFetch
      .mockRejectedValueOnce(new BackendError("server", "/mcp-tokens", 500))
      .mockResolvedValueOnce([]);
    await expect(result.current.create("a", true, 90, false)).rejects.toThrow(CREATE_FAILED);
    apiFetch.mockRejectedValueOnce(new BackendError("server", "/mcp-tokens/x", 500));
    await expect(result.current.revoke("x")).rejects.toThrow(REVOKE_FAILED);
  });

  describe("a create whose outcome is unknown", () => {
    const listCalls = () => apiFetch.mock.calls.filter(([, o]) => o?.method === undefined).length;
    const minted = { id: "t-unseen", name: "Claude", expiresAt: "2027-01-01T00:00:00.000Z" };

    it.each([
      ["a timeout or dropped connection", new BackendError("unavailable", "/mcp-tokens")],
      ["a gateway 5xx", new BackendError("server", "/mcp-tokens", 504)],
      ["a 2xx the client could not read", new BackendError("bad-response", "/mcp-tokens", 201)],
      ["an error that is not from the backend", new TypeError("Failed to fetch")],
    ])("reads the list again after %s, so a token made anyway is shown", async (_label, error) => {
      apiFetch.mockResolvedValueOnce([]);
      const { result } = renderHook(() => useMcpTokens());
      await waitFor(() => expect(result.current.tokens).toEqual([]));

      // The create fails for the browser, but the backend did mint the token.
      apiFetch.mockRejectedValueOnce(error).mockResolvedValueOnce([minted]);
      await act(async () => {
        await expect(result.current.create("Claude", true, 90, false)).rejects.toThrow(
          CREATE_FAILED,
        );
      });
      await waitFor(() => expect(result.current.tokens).toEqual([{ ...minted, lastUsedAt: null }]));
      expect(apiFetch).toHaveBeenLastCalledWith("/mcp-tokens", {
        signal: expect.any(AbortSignal),
        schema: McpTokenListResponse,
      });
      expect(listCalls()).toBe(2);
    });

    it.each([
      ["401", new BackendError("unauthorised", "/mcp-tokens", 401)],
      ["403", new BackendError("forbidden", "/mcp-tokens", 403)],
      ["404", new BackendError("not-found", "/mcp-tokens", 404)],
      ["422", new BackendError("client", "/mcp-tokens", 422)],
      ["429", new BackendError("client", "/mcp-tokens", 429)],
    ])("does not read the list again after a %s: nothing was made", async (_status, error) => {
      apiFetch.mockResolvedValueOnce([]);
      const { result } = renderHook(() => useMcpTokens());
      await waitFor(() => expect(result.current.tokens).toEqual([]));
      apiFetch.mockRejectedValueOnce(error);
      await act(async () => {
        await expect(result.current.create("Claude", true, 90, false)).rejects.toThrow();
      });
      expect(listCalls()).toBe(1);
    });

    it("keeps the list it had when the refresh fails too", async () => {
      apiFetch.mockResolvedValueOnce([{ id: "t1" }]);
      const { result } = renderHook(() => useMcpTokens());
      await waitFor(() => expect(result.current.tokens).toHaveLength(1));
      apiFetch
        .mockRejectedValueOnce(new BackendError("unavailable", "/mcp-tokens"))
        .mockRejectedValueOnce(new BackendError("unavailable", "/mcp-tokens"));
      await act(async () => {
        await expect(result.current.create("Claude", true, 90, false)).rejects.toThrow(
          CREATE_FAILED,
        );
      });
      await waitFor(() => expect(listCalls()).toBe(2));
      expect(result.current.tokens).toEqual([{ id: "t1", expiresAt: null, lastUsedAt: null }]);
    });

    it("does not let a slow refresh hide a token created while it was in flight", async () => {
      apiFetch.mockResolvedValueOnce([]);
      const { result } = renderHook(() => useMcpTokens());
      await waitFor(() => expect(result.current.tokens).toEqual([]));

      // The first create fails with a 504; its refresh is slow and reads the list before the
      // retry below, so its answer does not hold the retried token.
      let finishStaleRead: (list: unknown[]) => void = () => undefined;
      apiFetch
        .mockRejectedValueOnce(new BackendError("server", "/mcp-tokens", 504))
        .mockReturnValueOnce(new Promise((resolve) => (finishStaleRead = resolve)))
        .mockResolvedValueOnce({ id: "t-retry", name: "Claude" })
        .mockResolvedValueOnce([{ id: "t-retry" }, { id: "t-unseen" }]);
      await act(async () => {
        await expect(result.current.create("Claude", true, 90, false)).rejects.toThrow();
      });
      await act(async () => {
        await result.current.create("Claude", true, 90, false);
      });
      expect(result.current.tokens?.map((t) => t.id)).toEqual(["t-retry"]);

      await act(async () => finishStaleRead([]));
      // The out-of-date answer is not shown; the list is read once more instead.
      await waitFor(() =>
        expect(result.current.tokens?.map((t) => t.id)).toEqual(["t-retry", "t-unseen"]),
      );
      expect(listCalls()).toBe(3);
    });

    it("does not refresh or set state after the card has gone", async () => {
      apiFetch.mockResolvedValueOnce([]);
      const { result, unmount } = renderHook(() => useMcpTokens());
      await waitFor(() => expect(result.current.tokens).toEqual([]));
      const { create } = result.current;
      unmount();
      apiFetch.mockRejectedValueOnce(new BackendError("unavailable", "/mcp-tokens"));
      await expect(create("Claude", true, 90, false)).rejects.toThrow(CREATE_FAILED);
      expect(listCalls()).toBe(1);
    });
  });

  it("revokes and fetches the context pack", async () => {
    apiFetch.mockResolvedValueOnce([]).mockResolvedValueOnce(undefined).mockResolvedValueOnce({});
    const { result } = renderHook(() => useMcpTokens());
    await result.current.revoke("t 1");
    expect(apiFetch).toHaveBeenCalledWith("/mcp-tokens/t%201", {
      method: "DELETE",
      schema: RevokeMcpTokenResponse,
      allowEmpty: true,
    });
    await result.current.contextPack(false);
    expect(apiFetch).toHaveBeenLastCalledWith("/mcp-tokens/context-pack?anonymize=false", {
      schema: ContextPackResponse,
    });
  });
  it("keeps the shared list current after create and revoke, so the Imports link can show", async () => {
    apiFetch.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useMcpTokens());
    await waitFor(() => expect(result.current.tokens).toEqual([]));
    apiFetch.mockResolvedValueOnce({
      id: "t9",
      name: "Laptop",
      tokenPrefix: "flump_pat_ab",
      scopes: ["read", "write:stage"],
      anonymizeInstitutions: true,
      expiresAt: null,
      rawToken: `flump_pat_${"x".repeat(8)}`,
    });
    await act(() => result.current.create("Laptop", true, 90, true));
    expect(result.current.tokens?.[0]).toMatchObject({ id: "t9", scopes: ["read", "write:stage"] });
    apiFetch.mockResolvedValueOnce(undefined);
    await act(() => result.current.revoke("t9"));
    expect(result.current.tokens?.[0]?.isRevoked).toBe(true);
  });
});
