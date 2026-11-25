import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isOptionalStorageOff,
  OPTIONAL_STORAGE_KEY,
  optionalSessionStorage,
  setOptionalStorageOff,
  subscribeOptionalStorage,
} from "./optionalStorage";
import { isSceneSettled, markSceneSettled } from "./useSceneSettle";
import { getStoredStepCount, storeStepCount } from "./useSetupProgressOnce";

describe("optionalStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("allows optional storage until the person objects", () => {
    expect(isOptionalStorageOff()).toBe(false);
    expect(optionalSessionStorage()).toBe(window.sessionStorage);
    setOptionalStorageOff(true);
    expect(isOptionalStorageOff()).toBe(true);
    expect(optionalSessionStorage()).toBeNull();
  });

  it("treats any other stored value as not objected", () => {
    window.localStorage.setItem(OPTIONAL_STORAGE_KEY, "on");
    expect(isOptionalStorageOff()).toBe(false);
  });

  it("tells subscribers about each change and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOptionalStorage(listener);
    setOptionalStorageOff(true);
    setOptionalStorageOff(false);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    setOptionalStorageOff(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("clears this tab's optional keys when another tab switches optional storage off", () => {
    storeStepCount(2);
    window.sessionStorage.setItem("unrelated", "kept");
    // What the browser sends this tab after the other tab wrote the choice.
    window.localStorage.setItem(OPTIONAL_STORAGE_KEY, "off");
    window.dispatchEvent(
      new StorageEvent("storage", { key: OPTIONAL_STORAGE_KEY, newValue: "off" }),
    );
    expect(window.sessionStorage.getItem("flump.setup-step-count")).toBeNull();
    expect(window.sessionStorage.getItem("unrelated")).toBe("kept");
  });

  it("keeps this tab's optional keys when another tab switches it back on", () => {
    storeStepCount(2);
    window.dispatchEvent(
      new StorageEvent("storage", { key: OPTIONAL_STORAGE_KEY, newValue: null }),
    );
    expect(window.sessionStorage.getItem("flump.setup-step-count")).toBe("2");
  });

  it("stops the setup step count being written or read once off", () => {
    storeStepCount(3);
    expect(getStoredStepCount()).toBe(3);
    setOptionalStorageOff(true);
    expect(window.sessionStorage.getItem("flump.setup-step-count")).toBeNull();
    storeStepCount(4);
    expect(window.sessionStorage.getItem("flump.setup-step-count")).toBeNull();
    expect(getStoredStepCount()).toBeNull();
  });

  it("stops scene flags reaching sessionStorage once off, while the page still remembers them", () => {
    setOptionalStorageOff(true);
    markSceneSettled("optional-storage-test-scene");
    expect(window.sessionStorage.length).toBe(0);
    // Held in memory for this page view, so the animation still plays once.
    expect(isSceneSettled("optional-storage-test-scene")).toBe(true);
  });
});
