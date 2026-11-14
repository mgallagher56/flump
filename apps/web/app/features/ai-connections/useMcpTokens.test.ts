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
    apiFetch.mockRejectedValueOnce(new BackendError("server", "/mcp-tokens", 500));
    await expect(result.current.create("a", true, 90, false)).rejects.toThrow(CREATE_FAILED);
    apiFetch.mockRejectedValueOnce(new BackendError("server", "/mcp-tokens/x", 500));
    await expect(result.current.revoke("x")).rejects.toThrow(REVOKE_FAILED);
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
});
