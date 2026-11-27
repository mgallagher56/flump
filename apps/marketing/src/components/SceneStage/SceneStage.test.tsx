import type { ScenePower, StillReason } from "@repo/ui";
import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SceneStage, type SceneStartContext } from "./SceneStage";
import { stage } from "./SceneStage.styles";

const power = vi.hoisted(() => ({
  current: { mode: "still", reason: "pending", reportFps: () => {} } as unknown as ScenePower,
}));
const ambient = vi.hoisted(() => ({ running: true }));
const scene = vi.hoisted(() => ({
  start: vi.fn(),
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

const watchRef = createRef<HTMLDivElement>();
const onSceneChange = vi.fn();
const tree = () => (
  <div ref={watchRef}>
    <SceneStage onSceneChange={onSceneChange} start={scene.start} watchRef={watchRef}>
      <span data-testid="still-art" />
    </SceneStage>
  </div>
);

const startContext = () => scene.start.mock.calls[0]?.[0] as SceneStartContext;

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", OnScreenObserver);
  scene.start.mockResolvedValue(scene.handle);
  ambient.running = true;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SceneStage", () => {
  it("is the journey's full-screen layer by default and fills its band with fit band", () => {
    power.current = still("pending");
    const { rerender } = render(tree());
    const screenClass = screen.getByTestId("scene-stage").className;
    expect(screenClass).toContain(stage({ fit: "screen" }));
    rerender(
      <div ref={watchRef}>
        <SceneStage fit="band" start={scene.start} watchRef={watchRef}>
          <span />
        </SceneStage>
      </div>,
    );
    expect(screen.getByTestId("scene-stage").className).toContain(stage({ fit: "band" }));
    expect(stage({ fit: "band" })).not.toBe(stage({ fit: "screen" }));
  });

  it.each<StillReason>([
    "pending",
    "reduced-motion",
    "save-data",
    "low-memory",
    "few-cores",
    "no-webgl",
    "slow-frames",
  ])(
    "shows the still and never starts the scene when the policy says still (%s)",
    async (reason) => {
      power.current = still(reason);
      render(tree());
      await act(async () => {});
      const stage = screen.getByTestId("scene-stage");
      expect(stage.getAttribute("data-scene")).toBe("still");
      expect(stage.getAttribute("data-still-reason")).toBe(reason);
      expect(stage.getAttribute("aria-hidden")).toBe("true");
      expect(screen.getByTestId("still-art")).toBeTruthy();
      expect(scene.start).not.toHaveBeenCalled();
      expect(stage.querySelector("canvas")).toBeNull();
    },
  );

  it("starts the scene in the stage when live, and shows it once the first frame is drawn", async () => {
    power.current = live();
    render(tree());
    await act(async () => {});
    expect(scene.start).toHaveBeenCalledTimes(1);
    const context = startContext();
    const stage = screen.getByTestId("scene-stage");
    expect(context.container).toBe(stage);
    expect(context.running).toBe(true);
    expect(stage.getAttribute("data-scene")).toBe("still");
    expect(onSceneChange).toHaveBeenLastCalledWith("still");
    act(() => context.onFirstFrame());
    expect(stage.getAttribute("data-scene")).toBe("live");
    expect(stage.hasAttribute("data-still-reason")).toBe(false);
    expect(onSceneChange).toHaveBeenLastCalledWith("live");
  });

  it("pauses the scene while ambient motion is paused, and resumes it after", async () => {
    power.current = live();
    const { rerender } = render(tree());
    await act(async () => {});
    expect(scene.handle.setRunning).toHaveBeenLastCalledWith(true);
    ambient.running = false;
    rerender(tree());
    expect(scene.handle.setRunning).toHaveBeenLastCalledWith(false);
    ambient.running = true;
    rerender(tree());
    expect(scene.handle.setRunning).toHaveBeenLastCalledWith(true);
  });

  it("reports the frame rate to the policy, and falls back to the still when WebGL is lost", async () => {
    power.current = live();
    render(tree());
    await act(async () => {});
    const context = startContext();
    context.onVerdict({ kind: "too-slow", fps: 21 });
    expect(power.current.reportFps).toHaveBeenCalledWith(21);
    act(() => context.onLost());
    const stage = screen.getByTestId("scene-stage");
    expect(stage.getAttribute("data-scene")).toBe("still");
    expect(stage.getAttribute("data-still-reason")).toBe("failed");
    expect(scene.handle.dispose).toHaveBeenCalledTimes(1);
  });

  it("hands the scene a frame check that never counts frames from a hidden page", async () => {
    power.current = live();
    render(tree());
    await act(async () => {});
    const { frameCheck } = startContext();
    let hidden = true;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    // A background page at 5 fps for ten seconds: no verdict, so the scene never drops to still.
    const verdicts: string[] = [];
    for (let now = 0; now <= 10_000; now += 200) {
      const v = frameCheck.tick(now);
      if (v) verdicts.push(v.kind);
    }
    expect(verdicts).toEqual([]);
    // Shown again at 60 fps: after the one-second settle, the first window settles.
    hidden = false;
    for (let now = 10_000; now <= 13_500; now += 1000 / 60) {
      const v = frameCheck.tick(now);
      if (v) verdicts.push(v.kind);
    }
    expect(verdicts).toEqual(["settled"]);
    vi.restoreAllMocks();
  });

  it("keeps the still when the scene cannot be downloaded", async () => {
    power.current = live();
    scene.start.mockRejectedValueOnce(new Error("offline"));
    render(tree());
    await act(async () => {});
    expect(screen.getByTestId("scene-stage").getAttribute("data-still-reason")).toBe("failed");
  });
});
