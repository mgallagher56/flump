import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  type Texture,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/*
 * Shared three.js plumbing for prototypes 4 to 7. Only ever reached through a dynamic import
 * (see useLazyScene), so three.js is never in the first download. Assets are generated in code:
 * the environment map is three.js's own RoomEnvironment (MIT, part of the three package), and
 * textures are drawn on canvases. No downloaded files.
 */

/** Resolves a token variable (any colour syntax) to sRGB through a 1px canvas. */
export function tokenColour(name: string): Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx || !value) return new Color();
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
}

export const isDark = () =>
  document.documentElement.classList.contains("dark") ||
  document.documentElement.dataset.theme === "dark";

/** A soft round alpha mask (white or black), for glows, shadows and particles. */
export function softDot(size = 64, channel = 255, strength = 1): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const image = ctx.createImageData(size, size);
    const half = size / 2;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const d = Math.min(1, Math.hypot(x - half, y - half) / half);
        const i = (y * size + x) * 4;
        image.data[i] = channel;
        image.data[i + 1] = channel;
        image.data[i + 2] = channel;
        image.data[i + 3] = 255 * strength * (1 - d) * (1 - d);
      }
    }
    ctx.putImageData(image, 0, 0);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export interface FrameInfo {
  /** Seconds since the last frame (capped). */
  dt: number;
  /** Seconds the scene has been running. */
  t: number;
}

export interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  environment: Texture;
  /** Canvas size in CSS pixels. */
  size: { width: number; height: number };
  /** Called every frame while running, before the render. */
  onFrame: (callback: (frame: FrameInfo) => void) => void;
  /** Called after every resize. */
  onResize: (callback: (size: { width: number; height: number }) => void) => void;
  /** Disposes the renderer, environment and every mesh in the scene, and removes the canvas. */
  dispose: () => void;
}

export interface StageOptions {
  /** The element the canvas fills (positioned; the canvas is absolutely positioned inside). */
  container: HTMLElement;
  /** Rendering pauses while this element is off screen (defaults to the container). */
  watch?: HTMLElement;
  /** Called when the stage gives up (too slow, or the context is lost), to show the still. */
  onFallback: (reason: string) => void;
  fov?: number;
  maxPixelRatio?: number;
  /** Physically based effects (transmission) need it; off saves a little memory. */
  environment?: boolean;
}

/**
 * A transparent WebGL canvas with tone mapping, a generated environment map, a pixel ratio cap,
 * a render loop that pauses off screen and in a hidden tab, and a speed check: under 40 fps over
 * the first two seconds it drops to 1x, under 28 fps after that it calls `onFallback`.
 */
export function createStage({
  container,
  watch = container,
  onFallback,
  fov = 35,
  maxPixelRatio = 1.5,
  environment: wantEnvironment = true,
}: StageOptions): Stage {
  const renderer = new WebGLRenderer({
    antialias: window.devicePixelRatio < 2,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.domElement.className = "proto-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(fov, 1, 0.1, 200);
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  if (wantEnvironment) scene.environment = environment;

  const size = { width: 1, height: 1 };
  const frameCallbacks: ((frame: FrameInfo) => void)[] = [];
  const resizeCallbacks: ((s: { width: number; height: number }) => void)[] = [];

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    size.width = width;
    size.height = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    for (const callback of resizeCallbacks) callback(size);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  let onScreen = true;
  let raf = 0;
  let last = 0;
  let t = 0;
  const intersection = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    schedule();
  });
  intersection.observe(watch);
  const onVisibility = () => schedule();
  document.addEventListener("visibilitychange", onVisibility);

  let frames = 0;
  let windowStart = 0;
  let stage: "watch" | "downgraded" | "settled" = "watch";
  const checkSpeed = (now: number) => {
    if (stage === "settled") return;
    if (windowStart === 0) windowStart = now;
    frames += 1;
    const elapsed = now - windowStart;
    if (elapsed < 2000) return;
    const fps = (frames * 1000) / elapsed;
    frames = 0;
    windowStart = now;
    if (stage === "watch") {
      if (fps < 40) {
        renderer.setPixelRatio(1);
        resize();
        stage = "downgraded";
      } else {
        stage = "settled";
      }
    } else {
      stage = "settled";
      if (fps < 28) onFallback("Too slow on this device");
    }
  };

  const frame = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    t += dt;
    checkSpeed(now);
    for (const callback of frameCallbacks) callback({ dt, t });
    renderer.render(scene, camera);
    schedule();
  };

  function schedule() {
    if (raf) return;
    if (!onScreen || document.hidden) {
      last = 0;
      windowStart = 0;
      frames = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  const onLost = (event: Event) => {
    event.preventDefault();
    onFallback("WebGL context lost");
  };
  renderer.domElement.addEventListener("webglcontextlost", onLost);

  // Start on the next frame so callers can add their scene first.
  requestAnimationFrame(() => {
    resize();
    schedule();
  });

  return {
    renderer,
    scene,
    camera,
    environment,
    size,
    onFrame: (callback) => frameCallbacks.push(callback),
    onResize: (callback) => resizeCallbacks.push(callback),
    dispose: () => {
      cancelAnimationFrame(raf);
      raf = 0;
      onScreen = false;
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      scene.traverse((object) => {
        const mesh = object as { geometry?: { dispose: () => void }; material?: unknown };
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          const m = material as { dispose?: () => void; map?: { dispose: () => void } } | undefined;
          m?.map?.dispose();
          m?.dispose?.();
        }
      });
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
