import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  CanvasTexture,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NormalBlending,
  OrthographicCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Quaternion,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  approach,
  beadPositions,
  clampAnchors,
  edgeFade,
  orbTargetY,
  type RailMetrics,
  railMetrics,
  stopBlend,
  trackX,
} from "./journeyTrack";

/*
 * The journey's orb (three.js 0.187.0, UX-GUIDELINES MK12): a lit glass orb that rolls down a
 * winding bead track in the rail beside the stops, ported from prototype 11's `journeyScene.ts`
 * and `shared/threeKit.ts`. Only ever reached by `loadJourneyScene`'s dynamic import, after first
 * paint, never under reduced motion, and only when `useScenePower` says `live`.
 *
 * What changed from the prototype, by the owner's rulings: the orb and the track live in the rail
 * only, never behind a card or over text (MK8); there is no floor, no motes and no scrim, so nothing
 * full-screen moves behind the reading; the track's beads ahead of the orb are smaller and fainter
 * (the receding layer); the camera is orthographic at one unit to the CSS pixel, so the track is
 * drawn exactly where the rail scrolls. Colours come from the orb tokens, read from the page as
 * computed CSS colours (`JourneyPalette`), never written here.
 *
 * Set-up runs in small steps, one task each, so no main-thread task is long (ROLLOUT-PLAN M1
 * notes). Rendering pauses in a hidden tab, while the journey is off screen and while ambient
 * motion is paused (MK14). The frame rate check drops to a pixel ratio of 1, then gives up.
 */

/** The orb tokens and the page colours the scene needs, as computed CSS colour strings. */
export interface JourneyPalette {
  /** One per stop, in stop order: each stop's orb colour (`orb.skyTeal.*`, `orb.violetRose.*`). */
  readonly stopTones: readonly string[];
  /** The band's background, to tell Midnight from Mint. */
  readonly canvas: string;
}

/** The frame rate check's verdict (`createFrameRateCheck` in `@repo/ui`). */
export type FrameVerdict =
  | { readonly kind: "downgrade"; readonly fps: number }
  | { readonly kind: "settled"; readonly fps: number }
  | { readonly kind: "too-slow"; readonly fps: number };

export interface FrameCheck {
  tick(now: number): FrameVerdict | null;
  reset(): void;
}

export interface JourneySceneOptions {
  /** The sticky box the canvas fills, inside the rail. */
  readonly stage: HTMLElement;
  /** The rail: its top is y = 0, its height the track's range. */
  readonly rail: HTMLElement;
  /** The journey: rendering pauses while it is off screen. */
  readonly journey: HTMLElement;
  /** Each stop's marker (its name's dot), in stop order: the track passes level with each. */
  readonly markers: () => readonly HTMLElement[];
  readonly palette: () => JourneyPalette;
  readonly frameCheck: FrameCheck;
  /** The frame rate check's final word: `too-slow` makes the page show the still orb. */
  readonly onVerdict: (verdict: FrameVerdict) => void;
  /** The WebGL context was lost: the page shows the still orb. */
  readonly onLost: () => void;
  /** The first frame is on the canvas: the page may hide the still orb. */
  readonly onFirstFrame: () => void;
  /** Ambient motion may play now. */
  readonly running: boolean;
}

export interface JourneySceneHandle {
  /** Ambient motion paused or resumed (the page's control, MK14). */
  setRunning(running: boolean): void;
  /** The theme changed: read the palette again. */
  refreshColours(): void;
  dispose(): void;
}

/** One task's yield, so set-up steps never join into one long task. */
const nextTask = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

/** Resolves a CSS colour (any syntax the browser knows) to sRGB through a 1px canvas. */
function toColour(css: string, ctx: CanvasRenderingContext2D | null, out = new Color()): Color {
  if (!ctx || !css) return out.setRGB(1, 1, 1);
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return out.setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
}

/** A soft round alpha mask, for the orb's glow. */
function softDot(size = 64): CanvasTexture {
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
        image.data[i] = 255;
        image.data[i + 1] = 255;
        image.data[i + 2] = 255;
        image.data[i + 3] = 255 * (1 - d) * (1 - d);
      }
    }
    ctx.putImageData(image, 0, 0);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * A coloured Fresnel rim and a faint body glow, added to the glass's light: tinted at the edge,
 * the way coloured glass reads against a dark room (from the prototype).
 */
function addRim(
  material: MeshPhysicalMaterial,
  rim: { colour: Color; strength: { value: number }; glow: { value: number } },
) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uRimColour: { value: rim.colour },
      uRimStrength: rim.strength,
      uGlow: rim.glow,
    });
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "uniform vec3 uRimColour;\nuniform float uRimStrength;\nuniform float uGlow;\nvoid main() {",
      )
      .replace(
        "#include <opaque_fragment>",
        `{
          float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.2);
          outgoingLight += uRimColour * (rimF * uRimStrength + uGlow);
        }
        #include <opaque_fragment>`,
      );
  };
}

const luminance = (c: Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

export async function createJourneyScene(
  options: JourneySceneOptions,
): Promise<JourneySceneHandle> {
  const { stage, rail, journey, frameCheck } = options;
  let disposed = false;
  let running = options.running;

  // ----- Step 1: the renderer and its canvas -----

  const renderer = new WebGLRenderer({
    antialias: window.devicePixelRatio < 2,
    alpha: true,
    powerPreference: "low-power",
  });
  const maxPixelRatio = 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.journeyCanvas = "";
  stage.appendChild(canvas);
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
  camera.position.z = 500;
  await nextTask();

  // ----- Step 2: the environment the glass reflects (three.js's own RoomEnvironment) -----

  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  scene.environment = environment;
  await nextTask();

  // ----- Step 3: lights, the orb, its glow and the beads -----

  const key = new DirectionalLight(new Color(1, 1, 1), 1.6);
  key.position.set(-300, 400, 600);
  scene.add(key);
  const orbLight = new PointLight(new Color(1, 1, 1), 0, 0, 0);
  scene.add(orbLight);

  const orbRim = { colour: new Color(1, 1, 1), strength: { value: 0.9 }, glow: { value: 0 } };
  const orbGlass = new MeshPhysicalMaterial({
    roughness: 0.06,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 0.18,
    iridescenceIOR: 1.3,
    specularIntensity: 1,
  });
  addRim(orbGlass, orbRim);
  const orb = new Mesh(new SphereGeometry(1, 48, 32), orbGlass);
  scene.add(orb);

  const glowTexture = softDot();
  const glowMaterial = new MeshBasicMaterial({
    map: glowTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const glow = new Mesh(new PlaneGeometry(1, 1), glowMaterial);
  glow.renderOrder = -1;
  scene.add(glow);

  const MAX_BEADS = 600;
  const beadMaterial = new MeshStandardMaterial({ roughness: 0.25, metalness: 0 });
  const beadSet = new InstancedMesh(new SphereGeometry(1, 16, 12), beadMaterial, MAX_BEADS);
  beadSet.instanceMatrix.setUsage(DynamicDrawUsage);
  beadSet.frustumCulled = false;
  beadSet.count = 0;
  scene.add(beadSet);
  await nextTask();

  // ----- Colours -----

  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  let stopColours: Color[] = [];
  let dark = false;
  const white = new Color(1, 1, 1);
  const refreshColours = () => {
    const palette = options.palette();
    stopColours = palette.stopTones.map((css) => toColour(css, probe));
    dark = luminance(toColour(palette.canvas, probe)) < 0.3;
    orbGlass.envMapIntensity = dark ? 1.05 : 0.8;
    orbRim.strength.value = dark ? 1.2 : 0.8;
    orbRim.glow.value = dark ? 0.06 : 0;
    beadMaterial.envMapIntensity = dark ? 0.9 : 0.7;
    glowMaterial.blending = dark ? AdditiveBlending : NormalBlending;
    glowMaterial.opacity = dark ? 0.32 : 0.22;
    glowMaterial.needsUpdate = true;
    key.intensity = dark ? 1.3 : 1.8;
  };
  refreshColours();
  const colourAt = (y: number, out: Color) => {
    const { from, to, t } = stopBlend(y, anchors);
    const a = stopColours[from] ?? white;
    const b = stopColours[to] ?? a;
    return out.copy(a).lerpHSL(b, t);
  };

  // ----- Layout: the rail's size, the stops' anchors and the beads -----

  let width = 1;
  let height = 1;
  let metrics: RailMetrics = railMetrics(1);
  let anchors: number[] = [];
  let beads: { x: number; y: number; colour: Color }[] = [];

  const layout = () => {
    width = stage.clientWidth;
    height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    metrics = railMetrics(width);
    const railTop = rail.getBoundingClientRect().top;
    anchors = clampAnchors(
      options.markers().map((m) => {
        const box = m.getBoundingClientRect();
        return box.top + box.height / 2 - railTop;
      }),
      rail.clientHeight,
      metrics.orbRadius,
    );
    beads = beadPositions(anchors, metrics)
      .slice(0, MAX_BEADS)
      .map((p) => ({ ...p, colour: colourAt(p.y, new Color()) }));
    beadSet.count = beads.length;
    orb.scale.setScalar(metrics.orbRadius);
    glow.scale.setScalar(metrics.orbRadius * 2.2);
    orbLight.distance = metrics.orbRadius * 10;
  };
  layout();

  // Compile the glass off the main thread where the browser can, before the first frame.
  await renderer.compileAsync(scene, camera).catch(() => undefined);
  await nextTask();

  // ----- The frame -----

  let orbY: number | null = null;
  let roll = 0;
  let spin = 0;
  const tone = new Color();
  const target = new Color();
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const position = new Vector3();
  const beadTint = new Color();
  let firstFrame = true;

  /** One frame. `snap` puts the orb on its goal at once: used while ambient motion is paused. */
  const draw = (dt: number, snap = false) => {
    const railRect = rail.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const stageTop = stageRect.top - railRect.top;
    const header = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    const visibleTop = Math.min(height, Math.max(0, header - stageRect.top));
    camera.position.y = -(stageTop + height / 2);

    // The orb heads for the reading line and settles there calmly, held to the track.
    const goal = orbTargetY({
      stageTop,
      stageHeight: height,
      visibleTop,
      anchors,
      orbRadius: metrics.orbRadius,
    });
    const before = orbY ?? goal;
    orbY = orbY === null || snap ? goal : orbY + (goal - orbY) * approach(dt, 0.55);
    const x = trackX(orbY, anchors, metrics.amplitude);
    orb.position.set(x, -orbY, 0);
    glow.position.set(x, -orbY, -metrics.orbRadius * 2);
    // It rolls the way it travels; at rest it turns slowly, so its reflections drift.
    roll += (orbY - before) / metrics.orbRadius;
    spin += dt * 0.12;
    orb.rotation.set(roll, spin, 0);

    colourAt(orbY, target);
    if (firstFrame || snap) tone.copy(target);
    tone.lerpHSL(target, approach(dt, 0.6));
    orbGlass.color.copy(white).lerp(tone, dark ? 0.9 : 0.8);
    orbGlass.emissive.copy(tone);
    orbGlass.emissiveIntensity = dark ? 0.1 : 0.04;
    orbRim.colour.copy(tone);
    glowMaterial.color.copy(tone);
    orbLight.color.copy(tone);
    orbLight.intensity = dark ? 2.4 : 1.8;
    orbLight.position.set(x + metrics.orbRadius, -orbY + metrics.orbRadius, metrics.orbRadius * 3);

    // Beads: full size behind the orb, smaller and fainter ahead (the track recedes); those just
    // passed glow for a moment in their colour; all shrink away at the stage's edges.
    beads.forEach((bead, index) => {
      const yInStage = bead.y - stageTop;
      const fade = edgeFade(yInStage, height);
      const ahead = bead.y > (orbY as number);
      const r = metrics.beadRadius * (ahead ? 0.6 : 1) * fade;
      position.set(bead.x, -bead.y, -metrics.orbRadius);
      scale.setScalar(Math.max(1e-4, r));
      matrix.compose(position, quaternion, scale);
      beadSet.setMatrixAt(index, matrix);
      const behind = (orbY as number) - bead.y;
      const trail = behind >= 0 ? Math.exp(-behind / (metrics.orbRadius * 3)) : 0;
      beadTint
        .copy(bead.colour)
        .lerp(white, ahead ? (dark ? 0.35 : 0.5) : 0)
        .multiplyScalar(1 + trail * 0.6);
      beadSet.setColorAt(index, beadTint);
    });
    beadSet.instanceMatrix.needsUpdate = true;
    if (beadSet.instanceColor) beadSet.instanceColor.needsUpdate = true;

    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      options.onFirstFrame();
    }
  };

  // ----- The loop: pauses in a hidden tab, off screen and while ambient motion is paused -----

  let onScreen = false;
  let raf = 0;
  let last = 0;
  const frame = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    const verdict = frameCheck.tick(now);
    if (verdict?.kind === "downgrade") {
      renderer.setPixelRatio(1);
      layout();
    } else if (verdict) {
      options.onVerdict(verdict);
    }
    draw(dt);
    schedule();
  };
  function schedule() {
    if (raf || disposed) return;
    if (!onScreen || !running || document.hidden) {
      last = 0;
      frameCheck.reset();
      return;
    }
    raf = requestAnimationFrame(frame);
  }
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    frameCheck.reset();
  };

  // Observed only now that the frame code exists: a resize during the compile above must not call
  // schedule() before its state is declared (a temporal dead zone error, PR 975 review).
  const resizeObserver = new ResizeObserver(() => {
    layout();
    schedule();
  });
  resizeObserver.observe(stage);
  resizeObserver.observe(rail);

  const intersection = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    if (onScreen) schedule();
    else stop();
  });
  intersection.observe(journey);
  const onVisibility = () => (document.hidden ? stop() : schedule());
  // Paused, the orb has no ambient motion of its own (no spin, no easing), but it stays in line
  // with the stops as the visitor scrolls: one snapped frame per scroll, never a loop (MK14).
  let pausedFrame = 0;
  const onScroll = () => {
    if (running || !onScreen || pausedFrame || disposed) return;
    pausedFrame = requestAnimationFrame(() => {
      pausedFrame = 0;
      draw(0, true);
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  const onLost = (event: Event) => {
    event.preventDefault();
    options.onLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  // A first still frame even when ambient motion starts paused, so the orb is drawn in place.
  draw(0);

  return {
    setRunning(next) {
      running = next;
      if (running) schedule();
      else stop();
    },
    refreshColours() {
      refreshColours();
      for (const bead of beads) colourAt(bead.y, bead.colour);
      if (!raf) draw(0);
    },
    dispose() {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      if (pausedFrame) cancelAnimationFrame(pausedFrame);
      canvas.removeEventListener("webglcontextlost", onLost);
      scene.traverse((object) => {
        const mesh = object as { geometry?: { dispose: () => void }; material?: unknown };
        mesh.geometry?.dispose();
        (mesh.material as { dispose?: () => void } | undefined)?.dispose?.();
      });
      glowTexture.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
