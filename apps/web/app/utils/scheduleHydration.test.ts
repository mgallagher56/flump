// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { HYDRATION_IDLE_TIMEOUT_MS, scheduleHydration } from "./scheduleHydration";

describe("scheduleHydration", () => {
  it("asks for an idle moment with a 1 second limit, so a busy page still hydrates", () => {
    const requestIdleCallback = vi.fn();
    const setTimeout = vi.fn();
    const hydrate = vi.fn();
    scheduleHydration({ requestIdleCallback, setTimeout }, hydrate);
    expect(requestIdleCallback).toHaveBeenCalledWith(hydrate, { timeout: 1000 });
    expect(HYDRATION_IDLE_TIMEOUT_MS).toBe(1000);
    expect(setTimeout).not.toHaveBeenCalled();
  });

  it("falls back to a timer where there is no requestIdleCallback (Safari)", () => {
    const setTimeout = vi.fn();
    const hydrate = vi.fn();
    scheduleHydration({ setTimeout }, hydrate);
    expect(setTimeout).toHaveBeenCalledWith(hydrate, 1);
  });
});
