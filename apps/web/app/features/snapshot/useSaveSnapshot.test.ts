import { BackendError } from "@flump/api-client";
import { UpsertSnapshotResponse } from "@flump/api-contract";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
const toast = vi.fn();
const revalidate = vi.fn();

/** The `ETag` the next successful save answers with (the version of the rows it wrote). */
let nextEtag: string | null = null;
vi.mock("~/services/api-client", () => ({
  apiFetchVersioned: async (...a: unknown[]) => ({ data: await apiFetch(...a), etag: nextEtag }),
}));
vi.mock("@repo/ui", () => ({ useOptionalToast: () => ({ toast }) }));
vi.mock("react-router", () => ({ useRevalidator: () => ({ revalidate }) }));

const { snapshotIfMatch, useSaveSnapshot } = await import("./useSaveSnapshot");

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

    // A 400 that does not name source is a real error: no retry that would drop the source.
    apiFetch.mockReset();
    apiFetch.mockRejectedValue(badRequest());
    await act(async () => {
      ok = await result.current(withSource);
    });
    expect(ok).toBe(false);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});

describe("useSaveSnapshot conditional saves (BE-16, audit M7)", () => {
  const MONTH = "2026-11";
  const etag = (iso: string) => `"${iso}"`;
  const V1 = "2026-11-01T09:00:00.000Z";
  const V2 = "2026-11-02T09:00:00.000Z";
  const V3 = "2026-11-15T12:00:00.000Z";
  /** Saved rows as the loader returns them: two accounts this month, one last month. */
  const saved = [
    { accountId: "A", year: 2026, month: 11, updatedAt: V1 },
    { accountId: "b", year: 2026, month: 11, updatedAt: V2 },
    { accountId: "a", year: 2026, month: 10, updatedAt: "2026-10-01T09:00:00.000Z" },
  ];
  const conflict = () => new BackendError("client", `/snapshots/${MONTH}`, 412);
  const save = (accountId: string, value: number) => ({
    month: MONTH,
    payload: { values: [{ accountId, value }] },
    saved: 1,
    skipped: 0,
    quiet: true,
  });
  const sentIfMatch = (call: number) => apiFetch.mock.calls[call]?.[1].ifMatch;

  beforeEach(() => {
    apiFetch.mockReset();
    toast.mockReset();
    revalidate.mockReset();
    nextEtag = null;
  });

  it("sends the version of each row it writes, for that month and those accounts only", async () => {
    apiFetch.mockResolvedValue({});
    const { result } = renderHook(() => useSaveSnapshot(saved));
    await act(async () => {
      await result.current(save("a", 10));
      await result.current({
        ...save("a", 10),
        payload: {
          values: [
            { accountId: "a", value: 10 },
            { accountId: "B", value: 20 },
          ],
        },
      });
      // No row read for this account or this month: nothing to overwrite, so no header.
      await result.current(save("c", 30));
      await result.current({ ...save("a", 10), month: "2026-09" });
    });
    expect(sentIfMatch(0)).toBe(etag(V1));
    expect(sentIfMatch(1)).toBe(`${etag(V1)}, ${etag(V2)}`);
    expect(sentIfMatch(2)).toBeUndefined();
    expect(sentIfMatch(3)).toBeUndefined();
  });

  it("a second save of the same account sends the version its own first save wrote", async () => {
    apiFetch.mockResolvedValue({});
    nextEtag = etag(V3);
    const { result } = renderHook(() => useSaveSnapshot(saved));
    await act(async () => {
      // A new row this check-in: no version yet, then the one the save answered with.
      await result.current(save("c", 30));
      await result.current(save("c", 31));
      await result.current(save("a", 11));
      await result.current(save("a", 12));
    });
    expect(sentIfMatch(0)).toBeUndefined();
    expect(sentIfMatch(1)).toBe(etag(V3));
    expect(sentIfMatch(2)).toBe(etag(V1));
    expect(sentIfMatch(3)).toBe(`${etag(V1)}, ${etag(V3)}`);
  });

  it("a check-in save refused with 412 says so, reloads saved data and reports the failure", async () => {
    apiFetch.mockRejectedValue(conflict());
    const { result } = renderHook(() => useSaveSnapshot(saved));
    let ok = true;
    await act(async () => {
      ok = await result.current(save("a", 10));
    });
    // The caller keeps the typed answer (useCheckIn marks the step failed, with its retry).
    expect(ok).toBe(false);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    // Said even on a quiet save: the check-in's own retry text cannot say why.
    expect(toast).toHaveBeenCalledWith({
      title: "We did not save this because it was changed somewhere else",
      description: "The latest version is now loaded. Check it and save again.",
      tone: "warning",
    });
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it("after the reload, the retry sends the latest version and goes through", async () => {
    apiFetch.mockRejectedValueOnce(conflict()).mockResolvedValue({});
    const { result, rerender } = renderHook(({ rows }) => useSaveSnapshot(rows), {
      initialProps: { rows: saved },
    });
    await act(async () => {
      await result.current(save("a", 10));
    });
    // The loader ran again: account A now carries the version written somewhere else.
    rerender({
      rows: [{ accountId: "a", year: 2026, month: 11, updatedAt: V3 }, ...saved.slice(1)],
    });
    let ok = false;
    await act(async () => {
      ok = await result.current(save("a", 10));
    });
    expect(ok).toBe(true);
    expect(sentIfMatch(0)).toBe(etag(V1));
    expect(sentIfMatch(1)).toBe(etag(V3));
    expect(apiFetch.mock.calls[1]?.[1].body).toEqual({ values: [{ accountId: "a", value: 10 }] });
  });

  it("a history save refused with 412 shows the conflict, not the generic error", async () => {
    apiFetch.mockRejectedValue(conflict());
    const { result } = renderHook(() => useSaveSnapshot(saved));
    let ok = true;
    await act(async () => {
      ok = await result.current({ ...save("a", 10), quiet: false });
    });
    expect(ok).toBe(false);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0]?.[0].tone).toBe("warning");
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it("the save without `source` for an older backend sends the same versions", async () => {
    apiFetch
      .mockRejectedValueOnce(Object.assign(new Error("400"), { status: 400, detail: "source" }))
      .mockResolvedValueOnce({});
    const { result } = renderHook(() => useSaveSnapshot(saved));
    await act(async () => {
      await result.current({
        ...save("a", 10),
        payload: { values: [{ accountId: "a", value: 10, source: "confirmed" as const }] },
      });
    });
    expect(sentIfMatch(0)).toBe(etag(V1));
    expect(sentIfMatch(1)).toBe(etag(V1));
  });
});

describe("snapshotIfMatch", () => {
  it("ignores rows with no account, no version or a version that is not a date", () => {
    const payload = { values: [{ accountId: "a", value: 1 }] };
    expect(
      snapshotIfMatch(
        "2026-11",
        payload,
        [
          { accountId: null, year: 2026, month: 11, updatedAt: "2026-11-01T09:00:00.000Z" },
          { accountId: "a", year: 2026, month: 11 },
          { accountId: "a", year: "2026", month: "11", updatedAt: "junk" },
        ],
        new Map(),
      ),
    ).toBeUndefined();
  });
});
