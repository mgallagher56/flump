import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The module memoises its promises, so each test loads a fresh copy: this file is about module
// loading itself, the one case where `await import(...)` is the honest way to reach the subject.
vi.mock("./gsapKit", () => ({ gsap: "the gsap module" }));

const fresh = async () => {
  vi.resetModules();
  return import("./loadGsapKit");
};

let readyState: DocumentReadyState;

beforeEach(() => {
  vi.useFakeTimers();
  readyState = "complete";
  vi.spyOn(document, "readyState", "get").mockImplementation(() => readyState);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** True once `promise` has settled, after letting pending microtasks run. */
const settled = async (promise: Promise<unknown>) => {
  let done = false;
  void promise.then(() => {
    done = true;
  });
  await Promise.resolve();
  await Promise.resolve();
  return done;
};

describe("afterFirstPaint", () => {
  it("on a loaded page, waits for the browser's next idle moment, at most 1.5s", async () => {
    const idle = vi.fn<(cb: () => void, options: { timeout: number }) => number>(() => 1);
    vi.stubGlobal("requestIdleCallback", idle);
    const { afterFirstPaint } = await fresh();

    const painted = afterFirstPaint();

    expect(idle).toHaveBeenCalledTimes(1);
    expect(idle.mock.calls[0]?.[1]).toEqual({ timeout: 1500 });
    expect(await settled(painted)).toBe(false);
    idle.mock.calls[0]?.[0]();
    expect(await settled(painted)).toBe(true);
    // Memoised: a second call is the same promise and asks for no second idle moment.
    expect(afterFirstPaint()).toBe(painted);
    expect(idle).toHaveBeenCalledTimes(1);
  });

  it("before load, waits for the load event, then 200ms where idle callbacks are missing", async () => {
    readyState = "loading";
    vi.stubGlobal("requestIdleCallback", undefined);
    const { afterFirstPaint } = await fresh();

    const painted = afterFirstPaint();
    vi.advanceTimersByTime(1000);
    expect(await settled(painted)).toBe(false);

    window.dispatchEvent(new Event("load"));
    vi.advanceTimersByTime(199);
    expect(await settled(painted)).toBe(false);
    vi.advanceTimersByTime(1);
    expect(await settled(painted)).toBe(true);
  });
});

describe("loadGsapKit", () => {
  it("loads the GSAP module once, after first paint", async () => {
    vi.stubGlobal("requestIdleCallback", undefined);
    const { loadGsapKit } = await fresh();

    const kit = loadGsapKit();
    expect(loadGsapKit()).toBe(kit);
    expect(await settled(kit)).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    await expect(kit).resolves.toMatchObject({ gsap: "the gsap module" });
  });
});
