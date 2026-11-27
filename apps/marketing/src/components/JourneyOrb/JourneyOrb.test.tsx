import type { ScenePower, StillReason } from "@repo/ui";
import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JourneySceneOptions } from "../../motion/journey/journeyScene";
import { JourneyOrb } from "./JourneyOrb";

const power = vi.hoisted(() => ({
  current: { mode: "still", reason: "pending", reportFps: () => {} } as unknown as ScenePower,
}));
const ambient = vi.hoisted(() => ({ running: true }));
const scene = vi.hoisted(() => ({
  load: vi.fn(),
  create: vi.fn(),
  handle: { setRunning: vi.fn(), refreshColours: vi.fn(), dispose: vi.fn() },
}));

vi.mock("@repo/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/ui")>()),
  useScenePower: () => power.current,
}));
vi.mock("../../context/AmbientMotionContext", () => ({
  useAmbientMotion: () => ({
    running: ambient.running,
    paused: !ambient.running,
    available: true,
    toggle: () => {},
  }),
}));
vi.mock("../../motion/journey/loadJourneyScene", () => ({ loadJourneyScene: scene.load }));

const still = (reason: StillReason) =>
  ({ mode: "still", reason, reportFps: vi.fn() }) as unknown as ScenePower;
const live = () => ({ mode: "live", reason: null, reportFps: vi.fn() }) as unknown as ScenePower;

/** An IntersectionObserver that reports every element on screen at once. */
class OnScreenObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  disconnect() {}
  unobserve() {}
}

const renderOrb = () => {
  const journeyRef = createRef<HTMLDivElement>();
  const utils = render(
    <div ref={journeyRef}>
      <JourneyOrb journeyRef={journeyRef} tones={["sky", "violet", "teal"]} />
    </div>,
  );
  return { ...utils, journeyRef };
};

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", OnScreenObserver);
  scene.create.mockResolvedValue(scene.handle);
  scene.load.mockResolvedValue({ createJourneyScene: scene.create });
  ambient.running = true;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("JourneyOrb", () => {
  it.each<StillReason>([
    "pending",
    "reduced-motion",
    "save-data",
    "low-memory",
    "few-cores",
    "no-webgl",
    "slow-frames",
  ])(
    "shows the still orb and never loads three.js when the power policy says still (%s)",
    async (reason) => {
      power.current = still(reason);
      renderOrb();
      await act(async () => {});
      const rail = screen.getByTestId("journey-orb");
      expect(rail.getAttribute("data-scene")).toBe("still");
      expect(rail.getAttribute("data-still-reason")).toBe(reason);
      expect(rail.getAttribute("aria-hidden")).toBe("true");
      expect(screen.getByTestId("journey-still-orb")).toBeTruthy();
      expect(scene.load).not.toHaveBeenCalled();
      expect(rail.querySelector("canvas")).toBeNull();
    },
  );

  it("loads the live scene when the policy says live, and steps the still back once it has drawn", async () => {
    power.current = live();
    renderOrb();
    await act(async () => {});
    expect(scene.load).toHaveBeenCalledTimes(1);
    const options = scene.create.mock.calls[0]?.[0] as JourneySceneOptions;
    expect(options.running).toBe(true);
    expect(options.palette().stopTones).toHaveLength(3);
    const rail = screen.getByTestId("journey-orb");
    expect(rail.getAttribute("data-scene")).toBe("still");
    act(() => options.onFirstFrame());
    expect(rail.getAttribute("data-scene")).toBe("live");
    expect(rail.hasAttribute("data-still-reason")).toBe(false);
  });

  it("pauses the scene while ambient motion is paused, and resumes it after", async () => {
    power.current = live();
    const { rerender, journeyRef } = renderOrb();
    await act(async () => {});
    expect(scene.handle.setRunning).toHaveBeenLastCalledWith(true);
    ambient.running = false;
    rerender(
      <div ref={journeyRef}>
        <JourneyOrb journeyRef={journeyRef} tones={["sky", "violet", "teal"]} />
      </div>,
    );
    expect(scene.handle.setRunning).toHaveBeenLastCalledWith(false);
    ambient.running = true;
    rerender(
      <div ref={journeyRef}>
        <JourneyOrb journeyRef={journeyRef} tones={["sky", "violet", "teal"]} />
      </div>,
    );
    expect(scene.handle.setRunning).toHaveBeenLastCalledWith(true);
  });

  it("reports the measured frame rate to the power policy, and falls back to the still if WebGL is lost", async () => {
    power.current = live();
    renderOrb();
    await act(async () => {});
    const options = scene.create.mock.calls[0]?.[0] as JourneySceneOptions;
    options.onVerdict({ kind: "too-slow", fps: 21 });
    expect(power.current.reportFps).toHaveBeenCalledWith(21);
    act(() => options.onLost());
    const rail = screen.getByTestId("journey-orb");
    expect(rail.getAttribute("data-scene")).toBe("still");
    expect(rail.getAttribute("data-still-reason")).toBe("failed");
    expect(scene.handle.dispose).toHaveBeenCalledTimes(1);
  });

  it("keeps the still when the scene cannot be downloaded", async () => {
    power.current = live();
    scene.load.mockRejectedValueOnce(new Error("offline"));
    renderOrb();
    await act(async () => {});
    expect(screen.getByTestId("journey-orb").getAttribute("data-still-reason")).toBe("failed");
  });
});
