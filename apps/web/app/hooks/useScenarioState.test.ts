import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useScenarioState } from "./useScenarioState";

type Saved = { balance: number | null; rate: number | null; extra: number | null };
const saved: Saved = { balance: 180000, rate: 4.5, extra: null };

describe("useScenarioState", () => {
  test("seeds from saved and leaves unknown inputs empty (no invented defaults)", () => {
    const { result } = renderHook(() => useScenarioState(saved));
    expect(result.current.values).toEqual({ balance: 180000, rate: 4.5, extra: null });
    expect(result.current.isModified).toBe(false);
    expect(result.current.isEdited("balance")).toBe(false);
  });

  test("undefined saved inputs stay undefined", () => {
    const { result } = renderHook(() => useScenarioState<{ term?: number }>({ term: undefined }));
    expect(result.current.values.term).toBeUndefined();
  });

  test("set marks only the edited key and flags the scenario as modified", () => {
    const { result } = renderHook(() => useScenarioState(saved));
    act(() => result.current.set("rate", 5.2));
    expect(result.current.values.rate).toBe(5.2);
    expect(result.current.isEdited("rate")).toBe(true);
    expect(result.current.isEdited("balance")).toBe(false);
    expect(result.current.isModified).toBe(true);
  });

  test("setting a key back to its saved value clears the edited mark", () => {
    const { result } = renderHook(() => useScenarioState(saved));
    act(() => result.current.set("rate", 5.2));
    act(() => result.current.set("rate", 4.5));
    expect(result.current.isEdited("rate")).toBe(false);
    expect(result.current.isModified).toBe(false);
  });

  test("reset restores the saved figures", () => {
    const { result } = renderHook(() => useScenarioState(saved));
    act(() => {
      result.current.set("rate", 5.2);
      result.current.set("extra", 200);
    });
    act(() => result.current.reset());
    expect(result.current.values).toEqual(saved);
    expect(result.current.isModified).toBe(false);
  });

  test("unedited keys follow a revalidated saved value; edited keys are kept", () => {
    const { result, rerender } = renderHook(({ s }) => useScenarioState(s), {
      initialProps: { s: saved },
    });
    act(() => result.current.set("rate", 5.2));
    rerender({ s: { balance: 175000, rate: 4.0, extra: null } });
    expect(result.current.values.balance).toBe(175000);
    expect(result.current.values.rate).toBe(5.2);
    expect(result.current.isEdited("rate")).toBe(true);
    expect(result.current.isEdited("balance")).toBe(false);
  });

  test("an unknown saved input that becomes known is followed when unedited", () => {
    const { result, rerender } = renderHook(({ s }) => useScenarioState(s), {
      initialProps: { s: saved },
    });
    rerender({ s: { ...saved, extra: 50 } });
    expect(result.current.values.extra).toBe(50);
    expect(result.current.isModified).toBe(false);
  });

  describe("no side effects", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    test("never touches fetch, localStorage, sessionStorage or history", () => {
      const getItem = vi.spyOn(Storage.prototype, "getItem");
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      const removeItem = vi.spyOn(Storage.prototype, "removeItem");
      const pushState = vi.spyOn(window.history, "pushState");
      const replaceState = vi.spyOn(window.history, "replaceState");

      const { result } = renderHook(() => useScenarioState(saved));
      act(() => result.current.set("extra", 200));
      act(() => result.current.reset());

      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(getItem).not.toHaveBeenCalled();
      expect(setItem).not.toHaveBeenCalled();
      expect(removeItem).not.toHaveBeenCalled();
      expect(pushState).not.toHaveBeenCalled();
      expect(replaceState).not.toHaveBeenCalled();
    });
  });
});
