import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CHECK_IN_ACCOUNTS, CHECK_IN_DETAILS } from "./fixtures";
import type { AccountDetailInput } from "./snapshotModel";
import { useCheckIn } from "./useCheckIn";
import type { SaveSnapshot, SaveSnapshotArgs } from "./useSaveSnapshot";

const [everyday, isa, mortgage, card] = CHECK_IN_ACCOUNTS.map((a) => a.id) as [
  string,
  string,
  string,
  string,
];

const setup = (opts: { details?: AccountDetailInput[]; ok?: boolean[] } = {}) => {
  const results = [...(opts.ok ?? [])];
  const onSave = vi.fn(async (_args: SaveSnapshotArgs) => results.shift() ?? true);
  const hook = renderHook(
    ({ open }) =>
      useCheckIn({
        accounts: CHECK_IN_ACCOUNTS,
        accountDetails: opts.details ?? CHECK_IN_DETAILS,
        month: "2026-11",
        open,
        onSave: onSave as SaveSnapshot,
      }),
    { initialProps: { open: true } },
  );
  return { ...hook, onSave };
};

describe("useCheckIn", () => {
  it("orders steps by how often they change and starts at the first", () => {
    const { result } = setup();
    expect(result.current.steps.map((s) => s.accountId)).toEqual([everyday, card, isa, mortgage]);
    expect(result.current.index).toBe(0);
    expect(result.current.finished).toBe(false);
  });

  it("saves each confirmed step at once, quietly, with one PUT", async () => {
    const { result, onSave } = setup();
    const step = result.current.steps[0];
    if (!step) throw new Error("no step");
    let ok = false;
    await act(async () => {
      ok = await result.current.confirm(step, { kind: "update", value: 3412.5 });
    });
    expect(ok).toBe(true);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      month: "2026-11",
      payload: { values: [{ accountId: everyday, value: 3412.5, source: "manual" }] },
      saved: 1,
      skipped: 0,
      quiet: true,
    });
    expect(result.current.isDone(everyday)).toBe(true);
    expect(result.current.figure(everyday)).toMatchObject({ value: 3412.5, source: "manual" });
    expect(result.current.takeDirty()).toBe(true);
    expect(result.current.takeDirty()).toBe(false);
  });

  it("keeps a failed step open with its error, and saves it on retry", async () => {
    const { result, onSave } = setup({ ok: [false, true] });
    const step = result.current.steps[0];
    if (!step) throw new Error("no step");
    await act(async () => {
      await result.current.confirm(step, { kind: "noChange" });
    });
    expect(result.current.hasError(everyday)).toBe(true);
    expect(result.current.isDone(everyday)).toBe(false);
    expect(result.current.takeDirty()).toBe(false);
    await act(async () => {
      await result.current.retry(step);
    });
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(result.current.hasError(everyday)).toBe(false);
    expect(result.current.figure(everyday)).toMatchObject({ value: 3360, source: "confirmed" });
  });

  it("No change to the rest never overwrites a step whose save failed, and keeps its retry", async () => {
    const { result, onSave } = setup({ ok: [false, true] });
    const step = result.current.steps[0];
    if (!step) throw new Error("no step");
    await act(async () => {
      await result.current.confirm(step, { kind: "update", value: 1234 });
    });
    expect(result.current.hasError(everyday)).toBe(true);
    await act(async () => {
      await result.current.rest();
    });
    const restPayload = onSave.mock.calls[1]?.[0].payload;
    expect(restPayload?.values.some((v) => v.accountId === everyday)).toBe(false);
    expect(result.current.hasError(everyday)).toBe(true);
  });

  it("resumes at the first account with nothing recorded this month", () => {
    const { result } = setup({
      details: [
        ...CHECK_IN_DETAILS,
        { accountId: everyday, year: 2026, month: 11, value: 3400 },
        { accountId: card, year: 2026, month: 11, value: -640 },
      ],
    });
    expect(result.current.index).toBe(2);
    expect(result.current.isDone(everyday)).toBe(true);
    expect(result.current.nextOpen(0)).toBe(2);
  });

  it("records every remaining step in one PUT for No change to the rest, then finishes", async () => {
    const { result, onSave } = setup();
    const first = result.current.steps[0];
    if (!first) throw new Error("no step");
    await act(async () => {
      await result.current.confirm(first, { kind: "update", value: 3500 });
    });
    await act(async () => {
      await result.current.rest();
    });
    expect(onSave).toHaveBeenCalledTimes(2);
    const payload = onSave.mock.calls[1]?.[0].payload;
    // The mortgage keeps its calculated figure; the others repeat last month.
    expect(payload).toEqual({
      values: [
        { accountId: card, value: 640, source: "confirmed" },
        { accountId: isa, value: 14200, source: "confirmed" },
        { accountId: mortgage, value: 185999.56, source: "calculated" },
      ],
      complete: true,
    });
    expect(result.current.finished).toBe(true);
  });

  it("shows the summary once the last open step is saved", async () => {
    const { result } = setup({
      details: [
        ...CHECK_IN_DETAILS,
        { accountId: everyday, year: 2026, month: 11, value: 3400 },
        { accountId: card, year: 2026, month: 11, value: -640 },
        { accountId: isa, year: 2026, month: 11, value: 14200 },
      ],
    });
    const m = result.current.steps[3];
    if (!m) throw new Error("no step");
    await act(async () => {
      await result.current.confirm(m, { kind: "keepCalculated" });
    });
    await waitFor(() => expect(result.current.finished).toBe(true));
  });

  it("opens on the summary when every account already has a figure this month", () => {
    const all = CHECK_IN_ACCOUNTS.map((a) => ({
      accountId: a.id,
      year: 2026,
      month: 11,
      value: 1,
    }));
    const { result } = setup({ details: [...CHECK_IN_DETAILS, ...all] });
    expect(result.current.finished).toBe(true);
    act(() => result.current.reopen());
    expect(result.current.finished).toBe(false);
  });
});
