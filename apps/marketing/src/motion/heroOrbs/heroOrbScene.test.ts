import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The hero scene's lifecycle, with three.js stood in by small fakes (the real renderer needs WebGL):
 * it places one glass orb per still orb, in the same place; draws a first frame and says so; runs
 * only on screen and while ambient motion plays; drops to a pixel ratio of 1, then reports a slow
 * device; reports a lost context; and gives everything back on dispose.
 */

const three = vi.hoisted(() => {
  class Vec {
    x = 0;
    y = 0;
    z = 0;
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    setScalar(v: number) {
      return this.set(v, v, v);
    }
  }
  class Colour {
    r = 1;
    g = 1;
    b = 1;
    setRGB(r: number, g: number, b: number) {
      this.r = r;
      this.g = g;
      this.b = b;
      return this;
    }
    copy(c: Colour) {
      return this.setRGB(c.r, c.g, c.b);
    }
    lerp() {
      return this;
    }
  }
  class Obj {
    position = new Vec();
    rotation = new Vec();
    scale = new Vec();
    children: Obj[] = [];
    renderOrder = 0;
    add(child: Obj) {
      this.children.push(child);
    }
    remove(child: Obj) {
      this.children = this.children.filter((c) => c !== child);
    }
  }
  const meshes: Mesh[] = [];
  class Mesh extends Obj {
    constructor(
      public geometry: { dispose: () => void; kind?: string },
      public material: unknown,
    ) {
      super();
      meshes.push(this);
    }
  }
  class Light extends Obj {
    color = new Colour();
    intensity = 0;
    distance = 0;
  }
  const disposed: string[] = [];
  const glass: unknown[] = [];
  const material = (name: string) =>
    class {
      constructor() {
        if (name === "glass") glass.push(this);
      }
      color = new Colour();
      emissive = new Colour();
      attenuationColor = new Colour();
      onBeforeCompile: unknown;
      dispose() {
        disposed.push(name);
      }
    };
  const renderers: Renderer[] = [];
  class Renderer {
    domElement = document.createElement("canvas");
    pixelRatio = 0;
    renders = 0;
    toneMapping = 0;
    outputColorSpace = "";
    constructor() {
      renderers.push(this);
    }
    setPixelRatio(ratio: number) {
      this.pixelRatio = ratio;
    }
    setSize() {}
    render() {
      this.renders += 1;
    }
    dispose() {
      disposed.push("renderer");
    }
  }
  return {
    Vec,
    Colour,
    Obj,
    Mesh,
    Light,
    Renderer,
    renderers,
    disposed,
    material,
    meshes,
    glass,
  };
});

vi.mock("three", () => ({
  ACESFilmicToneMapping: 4,
  SRGBColorSpace: "srgb",
  Color: three.Colour,
  DirectionalLight: three.Light,
  PointLight: three.Light,
  Group: three.Obj,
  Scene: class extends three.Obj {
    environment: unknown;
  },
  Mesh: three.Mesh,
  PerspectiveCamera: class extends three.Obj {
    aspect = 1;
    updateProjectionMatrix() {}
  },
  PlaneGeometry: class {
    dispose() {
      three.disposed.push("plane");
    }
  },
  SphereGeometry: class {
    kind = "sphere";
    dispose() {
      three.disposed.push("sphere");
    }
  },
  MeshBasicMaterial: three.material("backdrop"),
  MeshPhysicalMaterial: three.material("glass"),
  PMREMGenerator: class {
    fromScene() {
      return {
        texture: {
          dispose() {
            three.disposed.push("environment");
          },
        },
      };
    }
    dispose() {
      three.disposed.push("pmrem");
    }
  },
  WebGLRenderer: three.Renderer,
}));
vi.mock("three/examples/jsm/environments/RoomEnvironment.js", () => ({
  RoomEnvironment: class {
    dispose() {}
  },
}));

import { createHeroOrbScene } from "./heroOrbScene";

type Callback = (entries: { isIntersecting: boolean }[]) => void;
let onScreen: Callback | undefined;
let resized: (() => void) | undefined;
let frames: FrameRequestCallback[] = [];

const box = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;

/** A stage 1000 by 400 holding two still orbs: a 200px violet one centred at (700, 200) and a 50px sky one. */
function stage(): HTMLElement {
  const container = document.createElement("div");
  Object.defineProperty(container, "clientWidth", { value: 1000 });
  Object.defineProperty(container, "clientHeight", { value: 400 });
  container.getBoundingClientRect = () => box(0, 0, 1000, 400);
  for (const [tone, rect] of [
    ["violet", box(600, 100, 200, 200)],
    ["sky", box(75, 275, 50, 50)],
  ] as const) {
    const orb = document.createElement("span");
    orb.dataset.glassOrb = "";
    orb.dataset.orbTone = tone;
    orb.getBoundingClientRect = () => rect;
    container.append(orb);
  }
  document.body.append(container);
  return container;
}

const options = (container: HTMLElement, running = true) => ({
  container,
  frameCheck: { tick: vi.fn(() => null), reset: vi.fn() },
  running,
  onVerdict: vi.fn(),
  onLost: vi.fn(),
  onFirstFrame: vi.fn(),
});

/** Runs the frames the scene asked for, at `now`. */
const tick = (now: number) => {
  const due = frames;
  frames = [];
  for (const frame of due) frame(now);
};

beforeEach(() => {
  three.renderers.length = 0;
  three.disposed.length = 0;
  three.meshes.length = 0;
  three.glass.length = 0;
  frames = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Callback) {
        onScreen = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resized = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    frames = [];
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

/** The glass orbs in the scene: the meshes in the group (the group is the scene's last child). */
const orbsOf = () => {
  const renderer = three.renderers[0];
  if (!renderer) throw new Error("no renderer");
  return renderer;
};

describe("createHeroOrbScene", () => {
  it("adds its canvas to the stage, hidden from assistive technology, and draws a first frame", () => {
    const container = stage();
    const opts = options(container);
    createHeroOrbScene(opts);
    const canvas = container.querySelector("canvas");
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    expect(canvas?.dataset.heroCanvas).toBe("");
    expect(orbsOf().renders).toBe(1);
    expect(opts.onFirstFrame).toHaveBeenCalledTimes(1);
  });

  it("places one glass orb per still orb, where the still orb sits, at its size and in its colour", () => {
    createHeroOrbScene(options(stage()));
    const orbs = three.meshes.filter((mesh) => mesh.geometry.kind === "sphere");
    expect(orbs).toHaveLength(2);
    // World units per pixel at the orbs' depth: 2 × 42 × tan(5°) over the stage's 400px.
    const u = (2 * 42 * Math.tan((10 * Math.PI) / 360)) / 400;
    const [violet, sky] = orbs;
    // Violet: centre (700, 200) of 1000 by 400, so x = (0.7 - 0.5) × 1000 px and y = 0; 200px
    // across, radius 100px. First orb: phase 0, so the float adds nothing at time 0.
    expect(violet?.position.x).toBeCloseTo(200 * u, 10);
    expect(violet?.position.y).toBeCloseTo(0, 10);
    expect(violet?.scale.x).toBeCloseTo(100 * u, 10);
    // Sky: centre (100, 300), so x = -400 px and y = (0.5 - 0.75) × 400 = -100 px; radius 25px.
    // Second orb: phase 1.7, so the float lifts it by sin(1.7) × 0.1 of its radius.
    expect(sky?.position.x).toBeCloseTo(-400 * u, 10);
    expect(sky?.position.y).toBeCloseTo(-100 * u + Math.sin(1.7) * 0.1 * 25 * u, 10);
    expect(sky?.scale.x).toBeCloseTo(25 * u, 10);
    // One glass per orb colour, in ORB_TONES order (sky, violet, teal, rose).
    expect(violet?.material).toBe(three.glass[1]);
    expect(sky?.material).toBe(three.glass[0]);
  });

  it("loops only on screen while ambient motion plays, and pausing draws one still frame", () => {
    const container = stage();
    const handle = createHeroOrbScene(options(container));
    const renderer = orbsOf();
    expect(frames).toHaveLength(0);
    onScreen?.([{ isIntersecting: true }]);
    expect(frames).toHaveLength(1);
    tick(16);
    tick(32);
    expect(renderer.renders).toBe(3);
    handle.setRunning(false);
    expect(frames).toHaveLength(0);
    expect(renderer.renders).toBe(4);
    handle.setRunning(true);
    expect(frames).toHaveLength(1);
    onScreen?.([{ isIntersecting: false }]);
    expect(frames).toHaveLength(0);
  });

  it("drops to a pixel ratio of 1 on a slow start, and reports a device too slow for it", () => {
    const container = stage();
    const opts = options(container);
    opts.frameCheck.tick
      .mockReturnValueOnce({ kind: "downgrade", fps: 35 } as never)
      .mockReturnValueOnce({ kind: "too-slow", fps: 20 } as never);
    createHeroOrbScene(opts);
    onScreen?.([{ isIntersecting: true }]);
    tick(16);
    expect(orbsOf().pixelRatio).toBe(1);
    expect(opts.onVerdict).not.toHaveBeenCalled();
    tick(32);
    expect(opts.onVerdict).toHaveBeenCalledWith({ kind: "too-slow", fps: 20 });
  });

  it("tells the stage when the WebGL context is lost", () => {
    const container = stage();
    const opts = options(container);
    createHeroOrbScene(opts);
    const lost = new Event("webglcontextlost", { cancelable: true });
    container.querySelector("canvas")?.dispatchEvent(lost);
    expect(opts.onLost).toHaveBeenCalledTimes(1);
    expect(lost.defaultPrevented).toBe(true);
  });

  it("redraws a paused scene when the colours change, and gives everything back on dispose", () => {
    const container = stage();
    const handle = createHeroOrbScene(options(container, false));
    const renderer = orbsOf();
    const before = renderer.renders;
    handle.refreshColours();
    expect(renderer.renders).toBe(before + 1);
    handle.dispose();
    expect(container.querySelector("canvas")).toBeNull();
    expect(three.disposed).toEqual(
      expect.arrayContaining([
        "glass",
        "sphere",
        "plane",
        "backdrop",
        "environment",
        "pmrem",
        "renderer",
      ]),
    );
    // Four glass materials, one per orb colour.
    expect(three.disposed.filter((name) => name === "glass")).toHaveLength(4);
  });
});
