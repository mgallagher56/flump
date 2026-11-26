import {
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { createStage, isDark, softDot, tokenColour } from "../shared/threeKit";
import type { SceneHandle } from "../shared/useLazyScene";
import { BEAD_COUNT, type Bead, BOX, SHAPES, type ShapeKey } from "./shapes";

/*
 * Prototype 6's guide: one set of glass beads on a fixed canvas that follows the page's slots.
 *
 * Each section reserves a slot (`[data-p6-slot="<shape>"]`), sticky while its copy scrolls. The
 * orb always sits on a slot's rectangle, so it never crosses text. Between two neighbouring slots
 * it blends rectangle and shape by how far the next slot has risen towards its sticky position;
 * that is the morph, tied to scroll. A slot marked `data-p6-detached` (the closing logo, after the
 * plain sections) is not blended with the one before: the orb leaves with the debt line and
 * settles as the logo as the closing slot rises.
 *
 * Refraction only sees the WebGL scene, so behind the beads sits a backdrop the size of the slot:
 * the page's canvas colour with a fine dot grid, drawn in a shader (crisp at any size). Through
 * the glass the dots bend and magnify, which is what makes the beads read as glass.
 */

const CAMERA_Z = 10;
const FOV = 35;
const BACKDROP_Z = -1.4;

/** cubic-bezier(0.65, 0, 0.35, 1), the site's "flumpInOut", solved for y at x. */
function flumpInOut(x: number): number {
  const ax = 3 * 0.65 - 3 * 0.35 + 1;
  const bx = 3 * 0.35 - 6 * 0.65;
  const cx = 3 * 0.65;
  let t = x;
  for (let i = 0; i < 6; i += 1) {
    const fx = ((ax * t + bx) * t + cx) * t - x;
    const d = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(d) < 1e-6) break;
    t -= fx / d;
  }
  t = Math.min(1, Math.max(0, t));
  // y control points are 0 and 1: y(t) = 3t^2 - 2t^3.
  return t * t * (3 - 2 * t);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Slot {
  element: HTMLElement;
  section: HTMLElement;
  shape: ShapeKey;
  detached: boolean;
  /** The slot's sticky top in px (where it rests while its copy scrolls). */
  home: number;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const DOT_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DOT_FRAGMENT = /* glsl */ `
  uniform vec3 uCanvas;
  uniform vec3 uDot;
  uniform vec3 uAccent;
  uniform vec2 uSizePx;
  uniform float uCellPx;
  varying vec2 vUv;
  void main() {
    vec2 px = (vUv - 0.5) * uSizePx;
    vec2 cell = px / uCellPx;
    vec2 local = fract(cell) - 0.5;
    // Radial fade: dots shrink to nothing towards the slot's edge, so it has no visible border.
    vec2 q = (vUv - 0.5) * 2.0;
    float dist = length(q * vec2(1.0, 1.0));
    float radius = 0.15 * smoothstep(1.02, 0.2, dist);
    float d = length(local);
    float aa = fwidth(d);
    float cover = 1.0 - smoothstep(radius - aa, radius + aa, d);
    vec3 dotColour = mix(uDot, uAccent, smoothstep(0.75, 0.0, dist) * 0.7);
    gl_FragColor = vec4(mix(uCanvas, dotColour, cover), 1.0);
    #include <colorspace_fragment>
  }
`;

export function createGuideScene(
  container: HTMLElement,
  onFallback: (reason: string) => void,
): SceneHandle {
  const stage = createStage({ container, onFallback, fov: FOV, maxPixelRatio: 1.5 });
  const { scene, camera } = stage;
  camera.position.set(0, 0, CAMERA_Z);
  camera.lookAt(0, 0, 0);

  const key = new DirectionalLight(new Color(1, 1, 1), 2.4);
  key.position.set(-4, 5, 6);
  const rim = new DirectionalLight(new Color(1, 1, 1), 1.2);
  rim.position.set(4, 2, -5);
  scene.add(key, rim);

  // The backdrop: canvas colour and dots, the thing the glass refracts.
  const dotUniforms = {
    canvas: new Color(),
    dot: new Color(),
    accent: new Color(),
    sizePx: new Vector2(1, 1),
  };
  const dotMaterial = new ShaderMaterial({
    vertexShader: DOT_VERTEX,
    fragmentShader: DOT_FRAGMENT,
    uniforms: {
      uCanvas: { value: dotUniforms.canvas },
      uDot: { value: dotUniforms.dot },
      uAccent: { value: dotUniforms.accent },
      uSizePx: { value: dotUniforms.sizePx },
      uCellPx: { value: 18 },
    },
    toneMapped: false,
  });
  const backdrop = new Mesh(new PlaneGeometry(1, 1), dotMaterial);
  backdrop.position.z = BACKDROP_Z;
  scene.add(backdrop);

  const guide = new Group();
  scene.add(guide);

  const glass = new MeshPhysicalMaterial({
    transmission: 1,
    thickness: 0.6,
    ior: 1.48,
    roughness: 0.035,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    attenuationDistance: 1.1,
    specularIntensity: 1,
    envMapIntensity: 1.15,
    dispersion: 0.18,
    // A soft coloured rim, so glass on the Midnight canvas still has an edge.
    sheen: 0.7,
    sheenRoughness: 0.35,
    iridescence: 0.25,
    iridescenceIOR: 1.3,
  });
  const beads = new InstancedMesh(new SphereGeometry(1, 56, 40), glass, BEAD_COUNT);
  beads.instanceMatrix.setUsage(DynamicDrawUsage);
  beads.frustumCulled = false;
  guide.add(beads);

  const shadowMaterial = new MeshBasicMaterial({
    map: softDot(64, 255, 1),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 0,
  });
  const shadow = new Mesh(new PlaneGeometry(1, 1), shadowMaterial);
  guide.add(shadow);

  const glassTint = new Color();
  const markColour = new Color();
  const refreshColours = () => {
    const canvas = tokenColour("--colors-surface-canvas");
    const text = tokenColour("--colors-text-secondary");
    markColour.copy(tokenColour("--colors-primary-mark"));
    dotUniforms.canvas.copy(canvas);
    dotUniforms.dot.copy(canvas.clone().lerp(text, 0.42));
    dotUniforms.accent.copy(markColour);
    const dark = isDark();
    // Mint (light) tints with the lit mark: the deep mark alone turns clear glass grey.
    const tint = dark ? markColour : tokenColour("--colors-primary-mark-lit");
    glassTint.copy(new Color(1, 1, 1).lerp(tint, dark ? 0.2 : 0.7));
    // The room's grey walls wash out pale glass; Mint takes less of them.
    glass.envMapIntensity = dark ? 1.15 : 0.65;
    glass.sheenColor.copy(markColour);
    glass.emissive.copy(markColour);
    glass.emissiveIntensity = dark ? 0.07 : 0;
    glass.attenuationColor.copy(new Color(1, 1, 1).lerp(tint, 0.7));
    shadowMaterial.color.copy(tokenColour("--colors-text-primary"));
  };
  refreshColours();

  let slots: Slot[] = [];
  const readSlots = () => {
    slots = Array.from(document.querySelectorAll<HTMLElement>("[data-p6-slot]")).map((element) => ({
      element,
      section: element.closest("section") ?? element,
      shape: (element.dataset.p6Slot as ShapeKey) ?? "hero",
      detached: element.dataset.p6Detached !== undefined,
      home: Number.parseFloat(getComputedStyle(element).top) || 0,
    }));
  };
  readSlots();
  stage.onResize(readSlots);

  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (event: PointerEvent) => {
    lean.tx = (event.clientX / window.innerWidth - 0.5) * 2;
    lean.ty = (event.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  let pairKey = "";
  let shown = 0;
  let sway = 0;
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const position = new Vector3();
  const scale = new Vector3();
  const box: Box = { left: 0, top: 0, width: 1, height: 1 };

  const lane = document.querySelector<HTMLElement>("[data-p6-lane]");

  /** Slot mode (wide screens): the orb rides each section's sticky slot and blends to the next. */
  const locateBySlots = (vh: number) => {
    const rects = slots.map((slot) => slot.element.getBoundingClientRect());
    const offsets = rects.map((r, i) => r.top - (slots[i]?.home ?? 0));
    let from = 0;
    for (let i = 0; i < offsets.length; i += 1) if ((offsets[i] ?? 1) <= 0.5) from = i;
    const to = Math.min(from + 1, slots.length - 1);
    const a = rects[from] as DOMRect;
    const b = rects[to] as DOMRect;
    let progress = 0;
    let rect: Box = a;
    if (to !== from && (offsets[from] ?? 0) <= 0.5) {
      const da = offsets[from] ?? 0;
      const db = offsets[to] ?? 0;
      if (slots[to]?.detached) {
        progress = clamp01(1 - db / (vh * 0.8));
        rect = progress > 0 || a.bottom <= 0 ? b : a;
      } else {
        progress = clamp01(-da / Math.max(1, db - da));
        box.left = lerp(a.left, b.left, progress);
        box.top = lerp(a.top, b.top, progress);
        box.width = lerp(a.width, b.width, progress);
        box.height = lerp(a.height, b.height, progress);
        rect = box;
      }
    }
    return { from, to, progress, rect };
  };

  /**
   * Lane mode (phones): one sticky lane at the top of the five areas. The orb morphs to a section's
   * shape as that section's heading rises up the reading area to the lane's lower edge.
   */
  const locateByLane = (vh: number, laneRect: DOMRect) => {
    const guided = slots.filter((slot) => !slot.detached).length;
    const closing = slots.findIndex((slot) => slot.detached);
    const closingRect = closing >= 0 ? slots[closing]?.element.getBoundingClientRect() : undefined;
    if (closingRect && laneRect.bottom <= 0) {
      const progress = clamp01(1 - (closingRect.top - (slots[closing]?.home ?? 0)) / (vh * 0.8));
      return { from: guided - 1, to: closing, progress, rect: closingRect as Box };
    }
    const anchor = laneRect.bottom;
    const span = vh * 0.38;
    let to = 0;
    for (let i = 1; i < guided; i += 1) {
      const top = slots[i]?.section.getBoundingClientRect().top ?? Infinity;
      if (top <= anchor + span) to = i;
    }
    if (to === 0) return { from: 0, to: 0, progress: 0, rect: laneRect as Box };
    const top = slots[to]?.section.getBoundingClientRect().top ?? 0;
    const progress = clamp01((anchor + span - top) / span);
    return { from: to - 1, to, progress, rect: laneRect as Box };
  };

  stage.onFrame(({ dt, t }) => {
    if (slots.length === 0) return;
    const vh = window.innerHeight;
    const laneRect = lane?.getBoundingClientRect();
    const { from, to, progress, rect } =
      laneRect && laneRect.height > 0 ? locateByLane(vh, laneRect) : locateBySlots(vh);
    const fromSlot = slots[from];
    const toSlot = slots[to];
    if (!fromSlot || !toSlot) return;

    // Scroll sets the target; the shape follows it closely, never lagging the slot itself.
    const key = `${from}:${to}`;
    if (key !== pairKey) {
      pairKey = key;
      shown = progress;
    }
    shown += (progress - shown) * (1 - Math.exp(-dt * 14));

    const visible = rect.top + rect.height > 0 && rect.top < vh && rect.width > 0;
    guide.visible = visible;
    backdrop.visible = visible;
    if (!visible) return;

    // Screen rectangle to world space on the z = 0 plane.
    const { width: W, height: H } = stage.size;
    const pxToWorld = (2 * CAMERA_Z * Math.tan((FOV * Math.PI) / 360)) / H;
    const cx = (rect.left + rect.width / 2 - W / 2) * pxToWorld;
    const cy = -(rect.top + rect.height / 2 - H / 2) * pxToWorld;
    const fit = Math.min(rect.width / BOX.width, rect.height / BOX.height) * pxToWorld * 0.92;

    const depth = (CAMERA_Z - BACKDROP_Z) / CAMERA_Z;
    backdrop.position.set(cx * depth, cy * depth, BACKDROP_Z);
    backdrop.scale.set(rect.width * pxToWorld * depth, rect.height * pxToWorld * depth, 1);
    dotUniforms.sizePx.set(rect.width, rect.height);

    // A slow turn while the section's copy scrolls past, so every step of scroll shows depth.
    const section = slots[progress > 0.5 ? to : from]?.section.getBoundingClientRect();
    const local = section ? clamp01(-section.top / Math.max(1, section.height - vh * 0.5)) : 0;
    sway += ((local - 0.5) * 0.55 - sway) * (1 - Math.exp(-dt * 6));
    lean.x += (lean.tx - lean.x) * (1 - Math.exp(-dt * 3));
    lean.y += (lean.ty - lean.y) * (1 - Math.exp(-dt * 3));

    const A = SHAPES[fromSlot.shape];
    const B = SHAPES[toSlot.shape];
    const eased = flumpInOut(shown);
    const solid = lerp(A.solid, B.solid, eased);
    const flatness = 1 - solid;

    guide.position.set(cx, cy, 0);
    const lift = Math.sin(t * 0.9) * 0.035;
    guide.scale.setScalar(fit);
    guide.rotation.set(lean.y * 0.08 * flatness, (sway + lean.x * 0.12) * flatness, 0);

    let lead: Bead | null = null;
    for (let i = 0; i < BEAD_COUNT; i += 1) {
      const p = A.beads[i];
      const q = B.beads[i];
      if (!p || !q) continue;
      // Beads set off in order across the target shape, so a line draws from left to right.
      const delay = 0.32 * ((q.x + BOX.width / 2) / BOX.width);
      const e = flumpInOut(clamp01((shown - delay) / 0.68));
      const swing = Math.sin(Math.PI * e) * 0.55;
      const r = Math.max(1e-4, lerp(p.r, q.r, e));
      position.set(lerp(p.x, q.x, e), lerp(p.y, q.y, e) + lift, lerp(p.z, q.z, e) + swing);
      scale.set(r * lerp(p.sx, q.sx, e), r * lerp(p.sy, q.sy, e), r);
      matrix.compose(position, quaternion, scale);
      beads.setMatrixAt(i, matrix);
      if (i === 0)
        lead = {
          ...p,
          x: position.x,
          y: position.y,
          z: position.z,
          r,
          sx: scale.x / r,
          sy: scale.y / r,
        };
    }
    beads.instanceMatrix.needsUpdate = true;

    // The logo settles: clear glass becomes its glossy teal body.
    glass.transmission = 1 - 0.82 * solid;
    glass.roughness = lerp(0.035, 0.28, solid);
    glass.color.copy(glassTint).lerp(markColour, solid);
    glass.thickness = lerp(0.6, 1.4, solid);

    const shadowStrength = lerp(A.shadow, B.shadow, eased);
    shadow.visible = shadowStrength > 0.01 && lead !== null;
    if (lead && shadow.visible) {
      shadow.position.set(lead.x, lead.y - lead.r * lead.sy - 0.1 - lift, lead.z - lead.r * 0.4);
      shadow.scale.set(lead.r * lead.sx * 2.5, lead.r * 0.42, 1);
      shadowMaterial.opacity = shadowStrength * 0.3;
    }
  });

  return {
    refreshColours,
    dispose: () => {
      window.removeEventListener("pointermove", onPointer);
      stage.dispose();
    },
  };
}
