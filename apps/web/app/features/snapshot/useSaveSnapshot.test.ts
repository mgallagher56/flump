import { UpsertSnapshotResponse } from "@flump/api-contract";
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
      schema: UpsertSnapshotResponse,
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

describe("useSaveSnapshot quiet saves", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    toast.mockReset();
    revalidate.mockReset();
  });

  it("saves without a toast or a reload, then refreshes once on request", async () => {
    apiFetch.mockResolvedValue({});
    const { result } = renderHook(() => useSaveSnapshot());
    let ok = false;
    await act(async () => {
      ok = await result.current({ ...args, quiet: true });
    });
    expect(ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
    result.current.refresh?.();
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it("reports a quiet failure to the caller only", async () => {
    apiFetch.mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useSaveSnapshot());
    let ok = true;
    await act(async () => {
      ok = await result.current({ ...args, quiet: true });
    });
    expect(ok).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });
});

describe("useSaveSnapshot against an older backend", () => {
  const withSource = {
    month: "2026-11",
    payload: { values: [{ accountId: "a", value: 10, source: "confirmed" as const }] },
    saved: 1,
    skipped: 0,
    quiet: true,
  };
  const badRequest = (detail?: string) => Object.assign(new Error("400"), { status: 400, detail });

  beforeEach(() => {
    apiFetch.mockReset();
    toast.mockReset();
  });

  it("saves again without source when the backend rejects it, with no error", async () => {
    apiFetch
      .mockRejectedValueOnce(badRequest('Unrecognized key: "source"'))
      .mockResolvedValueOnce({});
    const { result } = renderHook(() => useSaveSnapshot());
    let ok = false;
    await act(async () => {
      ok = await result.current(withSource);
    });
    expect(ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch.mock.calls[1]?.[1].body).toEqual({ values: [{ accountId: "a", value: 10 }] });
    expect(toast).not.toHaveBeenCalled();
  });

  it("retries only once, and not for other errors", async () => {
    apiFetch.mockRejectedValue(badRequest("source is not allowed"));
    const { result } = renderHook(() => useSaveSnapshot());
    let ok = true;
    await act(async () => {
      ok = await result.current(withSource);
    });
    expect(ok).toBe(false);
    expect(apiFetch).toHaveBeenCalledTimes(2);

    apiFetch.mockReset();
    apiFetch.mockRejectedValue(badRequest("a calculated value must match the calculated balance"));
    await act(async () => {
      ok = await result.current(withSource);
    });
    expect(ok).toBe(false);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
