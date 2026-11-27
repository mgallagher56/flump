import {
  ACESFilmicToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/*
 * A copy of shared/threeKit's createStage for the other pages, with one addition: `setRunning`.
 * The pages' pause control stops the scene for good (WCAG 2.2.2): the loop stops after one last
 * frame, so a paused scene costs nothing. The shared file is left as it is, because prototype 11
 * reads it. Same rules otherwise: renders only on screen and in a visible tab, caps the pixel
 * ratio, drops to 1x under 40 fps and gives up under 28 fps.
 */

export interface FrameInfo {
  dt: number;
  t: number;
}

export interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  size: { width: number; height: number };
  onFrame: (callback: (frame: FrameInfo) => void) => void;
  onResize: (callback: (size: { width: number; height: number }) => void) => void;
  setRunning: (running: boolean) => void;
  dispose: () => void;
}

export function createStage({
  container,
  onFallback,
  fov = 35,
  maxPixelRatio = 1.5,
  running: startRunning,
}: {
  container: HTMLElement;
  onFallback: (reason: string) => void;
  fov?: number;
  maxPixelRatio?: number;
  running: boolean;
}): Stage {
  const renderer = new WebGLRenderer({
    antialias: window.devicePixelRatio < 2,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.domElement.className = "o1-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(fov, 1, 0.1, 200);
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;

  const size = { width: 1, height: 1 };
  const frameCallbacks: ((frame: FrameInfo) => void)[] = [];
  const resizeCallbacks: ((s: { width: number; height: number }) => void)[] = [];
  let running = startRunning;

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
    // A paused scene still redraws once at its new size.
    if (!running) renderOnce();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  let onScreen = true;
  let raf = 0;
  let last = 0;
  let t = 0;
  let drawn = 0;
  const intersection = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    schedule();
  });
  intersection.observe(container);
  const onVisibility = () => schedule();
  document.addEventListener("visibilitychange", onVisibility);

  let frames = 0;
  let windowStart = 0;
  let check: "watch" | "downgraded" | "settled" = "watch";
  const checkSpeed = (now: number) => {
    if (check === "settled") return;
    if (windowStart === 0) windowStart = now;
    frames += 1;
    const elapsed = now - windowStart;
    if (elapsed < 2000) return;
    const fps = (frames * 1000) / elapsed;
    frames = 0;
    windowStart = now;
    if (check === "watch") {
      if (fps < 40) {
        renderer.setPixelRatio(1);
        resize();
        check = "downgraded";
      } else check = "settled";
    } else {
      check = "settled";
      if (fps < 28) onFallback("Too slow on this device");
    }
  };

  function renderOnce() {
    for (const callback of frameCallbacks) callback({ dt: 0, t });
    renderer.render(scene, camera);
  }

  const frame = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    t += dt;
    checkSpeed(now);
    for (const callback of frameCallbacks) callback({ dt, t });
    renderer.render(scene, camera);
    // For checks only: how many frames the loop has drawn (the pause test reads it).
    renderer.domElement.dataset.frames = String(++drawn);
    schedule();
  };

  function schedule() {
    if (raf) return;
    if (!running || !onScreen || document.hidden) {
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

  requestAnimationFrame(() => {
    resize();
    renderOnce();
    schedule();
  });

  return {
    renderer,
    scene,
    camera,
    size,
    onFrame: (callback) => frameCallbacks.push(callback),
    onResize: (callback) => resizeCallbacks.push(callback),
    setRunning: (next) => {
      running = next;
      if (!running) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      schedule();
    },
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
