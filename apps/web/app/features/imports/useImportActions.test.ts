import { ImportBatchResponse, ImportPreviewResponse } from "@flump/api-contract";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
const revalidate = vi.fn();

vi.mock("~/services/api-client", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));
vi.mock("react-router", () => ({ useRevalidator: () => ({ revalidate }) }));

const { useImportActions } = await import("./useImportActions");
const ID = "b0000000-0000-4000-8000-000000000001";

describe("useImportActions", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    revalidate.mockReset();
  });

  it("previews through the /api proxy without reloading saved data", async () => {
    apiFetch.mockResolvedValue({ rows: [] });
    const { result } = renderHook(() => useImportActions(ID));
    await result.current.preview({ saver: null });
    expect(apiFetch).toHaveBeenCalledWith(`/imports/${ID}/preview`, {
      method: "POST",
      schema: ImportPreviewResponse,
      body: { accountMap: { saver: null } },
      signal: undefined,
    });
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("commits with the map and ticked keys, then reloads", async () => {
    apiFetch.mockResolvedValue({ status: "committed" });
    const { result } = renderHook(() => useImportActions(ID));
    await expect(result.current.commit({ saver: "x" }, ["saver:2026-09"])).resolves.toEqual({
      status: "committed",
    });
    expect(apiFetch).toHaveBeenCalledWith(`/imports/${ID}/commit`, {
      method: "POST",
      schema: ImportBatchResponse,
      body: { accountMap: { saver: "x" }, overwriteManual: ["saver:2026-09"] },
      timeoutMs: 60_000,
    });
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it("reverts, then reloads; a failure is thrown and nothing reloads", async () => {
    apiFetch.mockResolvedValueOnce({ status: "reverted" });
    const { result } = renderHook(() => useImportActions(ID));
    await result.current.revert();
    expect(apiFetch).toHaveBeenLastCalledWith(`/imports/${ID}/revert`, {
      method: "POST",
      schema: ImportBatchResponse,
      body: {},
      timeoutMs: 60_000,
    });
    expect(revalidate).toHaveBeenCalledTimes(1);
    apiFetch.mockRejectedValueOnce(new Error("nope"));
    await expect(result.current.revert()).rejects.toThrow("nope");
    expect(revalidate).toHaveBeenCalledTimes(1);
  });
});
