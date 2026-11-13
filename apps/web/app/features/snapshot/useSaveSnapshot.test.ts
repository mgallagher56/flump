import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
const toast = vi.fn();
const revalidate = vi.fn();

vi.mock("~/services/api-client", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));
vi.mock("@repo/ui", () => ({ useOptionalToast: () => ({ toast }) }));
vi.mock("react-router", () => ({ useRevalidator: () => ({ revalidate }) }));

const { useSaveSnapshot } = await import("./useSaveSnapshot");

const args = {
  month: "2026-11",
  payload: { values: [{ accountId: "a", value: 10 }], complete: true },
  saved: 1,
  skipped: 0,
};

describe("useSaveSnapshot", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    toast.mockReset();
    revalidate.mockReset();
  });

  it("PUTs the month through the /api proxy, confirms with a toast and reloads saved data", async () => {
    apiFetch.mockResolvedValue({ month: "2026-11" });
    const { result } = renderHook(() => useSaveSnapshot());
    let ok = false;
    await act(async () => {
      ok = await result.current(args);
    });
    expect(ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith("/snapshots/2026-11", {
      method: "PUT",
      body: args.payload,
    });
    expect(toast).toHaveBeenCalledWith({
      title: "Balances saved for November 2026",
      tone: "positive",
    });
    expect(revalidate).toHaveBeenCalled();
  });

  it("describes a partial save", async () => {
    apiFetch.mockResolvedValue({});
    const { result } = renderHook(() => useSaveSnapshot());
    await act(async () => {
      await result.current({ ...args, saved: 2, skipped: 1 });
    });
    expect(toast.mock.calls[0]?.[0]).toMatchObject({
      title: "2 balances saved for November 2026",
      tone: "positive",
    });
  });

  it("reports a failure and leaves saved data alone", async () => {
    apiFetch.mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useSaveSnapshot());
    let ok = true;
    await act(async () => {
      ok = await result.current(args);
    });
    expect(ok).toBe(false);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ tone: "danger" }));
    expect(revalidate).not.toHaveBeenCalled();
  });
});
