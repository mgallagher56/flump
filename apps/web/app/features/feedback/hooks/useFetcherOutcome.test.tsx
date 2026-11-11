import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFetcherOutcome } from "./useFetcherOutcome";

type F = { state: "idle" | "submitting" | "loading"; data?: unknown };

function setup(initial: F = { state: "idle" }) {
  let fetcher = initial;
  const hook = renderHook(() => useFetcherOutcome(fetcher));
  const update = (next: F) => {
    fetcher = next;
    hook.rerender();
  };
  return { hook, update };
}

describe("useFetcherOutcome", () => {
  it("is idle until begin is called", () => {
    const { hook } = setup({ state: "idle", data: { success: false, error: "old" } });
    expect(hook.result.current.status).toBe("idle");
    expect(hook.result.current.error).toBeNull();
  });

  it("ignores a stale failure from an earlier submission", () => {
    const { hook, update } = setup({ state: "idle", data: { success: false, error: "old" } });
    act(() => hook.result.current.begin());
    expect(hook.result.current.status).toBe("pending");
    update({ state: "submitting", data: { success: false, error: "old" } });
    expect(hook.result.current.status).toBe("pending");
  });

  it("reports the action's error text when the new result is a failure", () => {
    const { hook, update } = setup();
    act(() => hook.result.current.begin());
    update({ state: "submitting" });
    update({ state: "idle", data: { success: false, error: "We couldn't find that." } });
    expect(hook.result.current.status).toBe("failed");
    expect(hook.result.current.error).toBe("We couldn't find that.");
  });

  it("falls back to generic copy when a failure has no text", () => {
    const { hook, update } = setup();
    act(() => hook.result.current.begin());
    update({ state: "idle", data: { success: false } });
    expect(hook.result.current.error).toBe("Something went wrong. Please try again.");
  });

  it("reports success and calls onSuccess once", () => {
    let calls = 0;
    let fetcher: F = { state: "idle" };
    const hook = renderHook(() => useFetcherOutcome(fetcher, { onSuccess: () => calls++ }));
    act(() => hook.result.current.begin());
    fetcher = { state: "idle", data: { success: true } };
    hook.rerender();
    hook.rerender();
    expect(hook.result.current.status).toBe("succeeded");
    expect(calls).toBe(1);
  });

  it("clears the error on begin and dismiss", () => {
    const { hook, update } = setup();
    act(() => hook.result.current.begin());
    update({ state: "idle", data: { success: false, error: "x" } });
    act(() => hook.result.current.begin());
    expect(hook.result.current.error).toBeNull();
    update({ state: "idle", data: { success: false, error: "y" } });
    expect(hook.result.current.error).toBe("y");
    act(() => hook.result.current.dismiss());
    expect(hook.result.current.status).toBe("idle");
  });
});
