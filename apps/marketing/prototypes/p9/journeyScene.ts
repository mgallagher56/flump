import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NormalBlending,
  PlaneGeometry,
  PointLight,
  Points,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { TIMING } from "../shared/pace";
import { createStage, isDark, softDot, tokenColour } from "../shared/threeKit";
import type { SceneHandle } from "../shared/useLazyScene";
import { COUNT_FORMATS, type CountFormat, type StopKind } from "./JourneyStops";

/*
 * Prototype 9's journey scene, grown from prototype 7's fly-through.
 *
 * Two layers share one camera. The CSS3D layer holds crisp, themable copies of the still visuals,
 * split at every `data-part`; the parts wait a little apart in depth and come together as the
 * camera arrives (scrubbed by scroll). Once a stop is reached, its copy plays its own moment on
 * time, paced by the round-three tokens: list bars grow, the payslip unfolds in real 3D, the
 * chart line draws, figures count.
 *
 * The WebGL layer is from prototype 6, with colour: a glass orb that rolls along the route with
 * the reader, glass bubbles beside each stop and a bead line that is the route itself. The glass
 * is tinted through its attenuation colour and lit by point lights in each stop's chart colour.
 * Refraction only sees opaque things, so the scene has an opaque backdrop in the page's own canvas
 * colour and an opaque floor lattice premixed with it: through the glass the lattice bends.
 * No fog or haze: distance fades are per point, never a wash over content.
 *
 * The layer is sticky inside the journey, so every pose is solved for where the layer sits at
 * that stop's anchor, and the 3D copy lands exactly on the still visual at the same pixel size.
 */

const SCALE = 0.01; // world units per CSS pixel
const GAP = 17; // depth between stops
const FLOOR = -3.4;
const FOV = 35;
const TAN = Math.tan((FOV * Math.PI) / 360);
const Y_SPOTS = [0.2, -0.3, 0.5, 0, 0.3, 0.4];

/** Each stop's colour: chart series, never a status colour; debt is violet, never red. */
const TONES: Record<string, string> = {
  accounts: "--colors-chart-series1",
  budget: "--colors-chart-series2",
  pay: "--colors-chart-series7",
  "savings-and-pension": "--colors-chart-series6",
  "debt-and-borrowing": "--colors-chart-series4",
  dashboard: "--colors-primary",
};
/** A second colour for each stop's bubbles. */
const ACCENTS: Record<string, string> = {
  accounts: "--colors-chart-series6",
  budget: "--colors-chart-series1",
  pay: "--colors-chart-series3",
  "savings-and-pension": "--colors-chart-series4",
  "debt-and-borrowing": "--colors-chart-series6",
  dashboard: "--colors-chart-series2",
};

const cubic = (x1: number, y1: number, x2: number, y2: number) => (x: number) => {
  const bez = (t: number, a: number, b: number) =>
    3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  let lo = 0;
  let hi = 1;
  let t = x;
  for (let i = 0; i < 18; i += 1) {
    t = (lo + hi) / 2;
    if (bez(t, x1, x2) < x) lo = t;
    else hi = t;
  }
  return bez(t, y1, y2);
};
/** pace.tsx EASE.out and EASE.inOut. */
const calm = cubic(0.25, 0.1, 0.2, 1);
const calmInOut = cubic(0.45, 0, 0.3, 1);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const c = clamp01(v);
  return c * c * (3 - 2 * c);
};

interface Pose {
  x: number;
  y: number;
  z: number;
}

interface Part {
  object: CSS3DObject;
  base: Vector3;
  away: Vector3;
  turn: number;
  lead: number;
  last: number;
}

interface Fold {
  hinge: Group;
  elements: HTMLElement[];
  face: HTMLElement;
  back: HTMLElement;
  /** Which side faces the camera: 1 the face, 0 the back (backface-visibility is unreliable here). */
  showing: number;
  shade: HTMLElement | null;
  lastShade: number;
}

interface Stop {
  key: string;
  kind: StopKind;
  group: Group;
  frame: CSS3DObject;
  parts: Part[];
  /** Payslip panels (no flying parts: the folded slip arrives whole, then opens). */
  folds: { top?: Fold; bottom?: Fold; middle?: HTMLElement };
  position: Vector3;
  side: number;
  halfWidth: number;
  lastOpacity: number;
  /** Calm milliseconds of the stop's own moment played so far. */
  elapsed: number;
  lastElapsed: number;
  counts: { el: HTMLElement; value: number; format: CountFormat; last: string }[];
  bars: HTMLElement[];
  draws: SVGPathElement[];
  fades: SVGElement[];
  light: PointLight;
  tone: Color;
  accent: Color;
}

const FLOOR_VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uHead;
  varying float vDepth;
  varying float vLit;
  varying float vSeed;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    float d = distance(world.xz, uHead.xz);
    vLit = exp(-d * d / 9.0);
    vSeed = aSeed;
    gl_PointSize = uSize * uPixelRatio * (1.0 + vLit * 0.7) / max(vDepth, 0.5) * 10.0;
    gl_Position = projectionMatrix * mv;
  }
`;

/** Opaque points premixed with the canvas colour, so refraction can see them. */
const FLOOR_FRAGMENT = /* glsl */ `
  uniform vec3 uCanvas;
  uniform vec3 uColour;
  uniform vec3 uLitColour;
  uniform float uOpacity;
  uniform float uFar;
  varying float vDepth;
  varying float vLit;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float edge = 1.0 - smoothstep(0.3, 0.5, r);
    float fade = (1.0 - smoothstep(uFar * 0.45, uFar, vDepth)) * smoothstep(0.8, 3.0, vDepth);
    float a = clamp(uOpacity * edge * fade * (0.55 + 0.45 * vSeed + vLit * 1.4), 0.0, 1.0);
    if (a < 0.01) discard;
    vec3 ink = mix(uColour, uLitColour, clamp(vLit * 1.3, 0.0, 1.0));
    gl_FragColor = vec4(mix(uCanvas, ink, a), 1.0);
    #include <colorspace_fragment>
  }
`;

const MOTE_VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uPixelRatio;
  uniform float uTime;
  varying float vDepth;
  varying float vSeed;
  void main() {
    vec3 p = position;
    p.y += mod(uTime * 0.1 + aSeed * 9.0, 7.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    vSeed = aSeed;
    gl_PointSize = 13.0 * uPixelRatio / max(vDepth, 0.5);
    gl_Position = projectionMatrix * mv;
  }
`;

const MOTE_FRAGMENT = /* glsl */ `
  uniform vec3 uColour;
  uniform float uOpacity;
  varying float vDepth;
  varying float vSeed;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float fade = (1.0 - smoothstep(18.0, 40.0, vDepth)) * smoothstep(2.0, 5.0, vDepth);
    gl_FragColor = vec4(uColour, uOpacity * fade * (1.0 - r * 2.0) * (0.4 + 0.6 * vSeed));
    #include <colorspace_fragment>
  }
`;

export function createJourneyScene({
  container,
  journey,
  onFallback,
  getPace,
}: {
  container: HTMLElement;
  journey: HTMLElement;
  onFallback: (reason: string) => void;
  /** The pace factor (1 Calm, 0.75 Medium, 0.55 Brisk), read every frame. */
  getPace: () => number;
}): SceneHandle {
  const stage = createStage({ container, watch: journey, onFallback, fov: FOV });
  const { scene, camera, renderer } = stage;
  scene.add(camera);

  const css = new CSS3DRenderer();
  css.domElement.className = "p9-css3d";
  css.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(css.domElement);

  const sections = Array.from(journey.querySelectorAll<HTMLElement>("[data-stop]"));
  const intro = journey.querySelector<HTMLElement>("[data-journey-intro]");

  // ----- Backdrop: the page's canvas colour, opaque, so the glass has something to refract -----

  const backdropMaterial = new MeshBasicMaterial({ toneMapped: false, depthWrite: false });
  const backdrop = new Mesh(new PlaneGeometry(1, 1), backdropMaterial);
  backdrop.position.z = -150;
  backdrop.renderOrder = -10;
  camera.add(backdrop);

  // ----- Light: a white key from above, and one light per stop in its colour -----

  const key = new DirectionalLight(new Color(1, 1, 1), 1.6);
  key.position.set(-4, 8, 6);
  scene.add(key);

  // ----- Glass -----

  const glassBase = {
    transmission: 1,
    ior: 1.45,
    roughness: 0.05,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    specularIntensity: 1,
    iridescence: 0.3,
    iridescenceIOR: 1.3,
    sheen: 0.6,
    sheenRoughness: 0.4,
  };
  const beadGlass = new MeshPhysicalMaterial({
    ...glassBase,
    thickness: 0.5,
    attenuationDistance: 0.8,
  });
  const orbGlass = new MeshPhysicalMaterial({
    ...glassBase,
    thickness: 1.1,
    attenuationDistance: 0.7,
    dispersion: 0.2,
  });

  const orb = new Mesh(new SphereGeometry(1, 64, 44), orbGlass);
  const ORB_R = 0.62;
  orb.scale.setScalar(ORB_R);
  scene.add(orb);
  const shadowTexture = softDot(64, 255, 1);
  const shadowMaterial = new MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const shadow = new Mesh(new PlaneGeometry(1, 1), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  // ----- Cards: CSS3D copies of the still visuals -----

  const stops: Stop[] = [];
  const cardRoot = new Group();
  scene.add(cardRoot);

  const clear = (el: HTMLElement) => {
    el.removeAttribute("id");
    for (const child of el.querySelectorAll("[id]")) child.removeAttribute("id");
    el.removeAttribute("title");
    for (const child of el.querySelectorAll("[title]")) child.removeAttribute("title");
    // The visible copy of a counting figure is enough: drop the screen reader duplicates.
    for (const child of el.querySelectorAll(".p9-sr, .p1b-sr")) child.remove();
  };

  const hookUp = (stop: Stop, el: HTMLElement) => {
    for (const c of el.querySelectorAll<HTMLElement>("[data-count]"))
      stop.counts.push({
        el: c,
        value: Number(c.dataset.count),
        format: (c.dataset.format as CountFormat) ?? "gbp",
        last: "",
      });
    for (const b of el.querySelectorAll<HTMLElement>("[data-bar]")) stop.bars.push(b);
    for (const p of el.querySelectorAll<SVGPathElement>("[data-draw]")) {
      p.style.strokeDasharray = "1";
      stop.draws.push(p);
    }
    for (const f of el.querySelectorAll<SVGElement>("[data-fade]")) stop.fades.push(f);
  };

  const buildFolds = (stop: Stop, still: HTMLElement, cx: number, cy: number) => {
    const panel = (name: string) => still.querySelector<HTMLElement>(`[data-fold="${name}"]`);
    const middle = panel("middle");
    if (!middle) return;
    const m = middle.getBoundingClientRect();
    const local = (r: DOMRect) =>
      new Vector3(r.left + r.width / 2 - cx, -(r.top + r.height / 2 - cy), 0);
    const copy = (el: HTMLElement, r: DOMRect) => {
      const c = el.cloneNode(true) as HTMLElement;
      clear(c);
      c.classList.add("p9-fold");
      c.style.width = `${r.width}px`;
      c.style.height = `${r.height}px`;
      return c;
    };
    const midEl = copy(middle, m);
    const midObject = new CSS3DObject(midEl);
    midObject.position.copy(local(m));
    stop.group.add(midObject);
    stop.folds.middle = midEl;
    hookUp(stop, midEl);

    for (const name of ["top", "bottom"] as const) {
      const el = panel(name);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const dir = name === "top" ? 1 : -1;
      const hinge = new Group();
      // The hinge is the crease between this panel and the middle one.
      hinge.position.set(
        r.left + r.width / 2 - cx,
        -((name === "top" ? m.top : m.bottom) - cy),
        dir * 0.6,
      );
      const face = copy(el, r);
      const faceObject = new CSS3DObject(face);
      faceObject.position.set(0, (dir * r.height) / 2, 0);
      const back = document.createElement("div");
      back.className = "p9-fold-back";
      back.style.width = `${r.width}px`;
      back.style.height = `${r.height}px`;
      if (name === "top") back.textContent = "Payslip, example";
      const backObject = new CSS3DObject(back);
      backObject.position.set(0, (dir * r.height) / 2, 0);
      backObject.rotation.set(Math.PI, 0, 0);
      hinge.add(faceObject, backObject);
      stop.group.add(hinge);
      hookUp(stop, face);
      stop.folds[name] = {
        hinge,
        elements: [face, back],
        face,
        back,
        showing: -1,
        shade: face.querySelector<HTMLElement>(".p9-slip__shade"),
        lastShade: -1,
      };
    }
  };

  const disposeCards = () => {
    for (const stop of stops) {
      stop.group.traverse((o) => {
        if (o instanceof CSS3DObject) o.element.remove();
      });
      cardRoot.remove(stop.group);
      scene.remove(stop.light);
      stop.light.dispose();
    }
    stops.length = 0;
  };

  const buildCards = () => {
    disposeCards();
    const last = sections.length - 1;
    sections.forEach((section, index) => {
      const still = section.querySelector<HTMLElement>("[data-stop-card]");
      if (!still) return;
      const rect = still.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const side = section.dataset.cardSide === "left" ? -1 : 1;
      const stopKey = section.dataset.stopKey ?? "";
      const x = index === last && stopKey === "dashboard" ? 0 : side * (2.8 + (index % 2) * 0.4);
      const position = new Vector3(
        x,
        Y_SPOTS[index % Y_SPOTS.length] ?? 0,
        -index * GAP - (index === last ? 4 : 0),
      );
      const kind = (still.dataset.kind as StopKind) ?? "card";

      const group = new Group();
      group.position.copy(position);
      group.scale.setScalar(SCALE);
      cardRoot.add(group);

      const frameEl = still.cloneNode(true) as HTMLElement;
      clear(frameEl);
      frameEl.style.width = `${rect.width}px`;
      frameEl.style.margin = "0";
      for (const p of frameEl.querySelectorAll<HTMLElement>("[data-part], [data-fold]"))
        p.style.visibility = "hidden";
      const frame = new CSS3DObject(frameEl);
      group.add(frame);

      const light = new PointLight(new Color(1, 1, 1), 0, 14, 1.6);
      light.position.set(position.x - side * 1.5, position.y + 2.2, position.z + 3);
      scene.add(light);

      const stop: Stop = {
        key: stopKey,
        kind,
        group,
        frame,
        parts: [],
        folds: {},
        position,
        side,
        halfWidth: (rect.width * SCALE) / 2,
        lastOpacity: -1,
        elapsed: 0,
        lastElapsed: -1,
        counts: [],
        bars: [],
        draws: [],
        fades: [],
        light,
        tone: new Color(),
        accent: new Color(),
      };

      if (kind === "payslip") {
        buildFolds(stop, still, cx, cy);
      } else {
        const stillParts = Array.from(still.querySelectorAll<HTMLElement>("[data-part]"));
        stop.parts = stillParts.map((stillPart, j) => {
          const r = stillPart.getBoundingClientRect();
          const el = stillPart.cloneNode(true) as HTMLElement;
          clear(el);
          el.classList.add("p9-part");
          const tile = el.classList.contains("p9-dash__tile");
          el.style.width = `${r.width + (tile ? 0 : 16)}px`;
          const object = new CSS3DObject(el);
          const base = new Vector3(r.left + r.width / 2 - cx, -(r.top + r.height / 2 - cy), 1 + j);
          const lane = j - (stillParts.length - 1) / 2;
          // Each part waits a little nearer the camera and apart from its neighbours; the head
          // lands first, then each piece in reading order, all before the camera arrives.
          const away = new Vector3(0, lane * 14, 60 + j * 22);
          const lead =
            0.08 + ((stillParts.length - 1 - j) / Math.max(1, stillParts.length - 1)) * 0.26;
          group.add(object);
          hookUp(stop, el);
          return { object, base, away, lead, turn: (j % 2 ? 1 : -1) * 0.05, last: -1 };
        });
      }
      stops.push(stop);
    });
  };

  // ----- Floor lattice, lit around the orb -----

  const zNear = 34;
  const zFar = -(sections.length * GAP + 30);
  const floorPositions: number[] = [];
  const floorSeeds: number[] = [];
  for (let z = zNear; z >= zFar; z -= 1.1) {
    for (let x = -22; x <= 22; x += 1.1) {
      floorPositions.push(x, FLOOR, z);
      floorSeeds.push(Math.random());
    }
  }
  const floorGeometry = new BufferGeometry();
  floorGeometry.setAttribute("position", new Float32BufferAttribute(floorPositions, 3));
  floorGeometry.setAttribute("aSeed", new Float32BufferAttribute(floorSeeds, 1));
  const floorUniforms = {
    uSize: { value: 2.4 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uHead: { value: new Vector3() },
    uCanvas: { value: new Color() },
    uColour: { value: new Color() },
    uLitColour: { value: new Color() },
    uOpacity: { value: 0.5 },
    uFar: { value: 48 },
  };
  const floor = new Points(
    floorGeometry,
    new ShaderMaterial({
      uniforms: floorUniforms,
      vertexShader: FLOOR_VERTEX,
      fragmentShader: FLOOR_FRAGMENT,
    }),
  );
  scene.add(floor);

  // ----- Motes: a few slow rising points in the air, for depth -----

  const motePositions: number[] = [];
  const moteSeeds: number[] = [];
  for (let i = 0; i < 180; i += 1) {
    motePositions.push(
      (Math.random() - 0.5) * 26,
      FLOOR + Math.random() * 1.5,
      zNear - Math.random() * (zNear - zFar),
    );
    moteSeeds.push(Math.random());
  }
  const moteGeometry = new BufferGeometry();
  moteGeometry.setAttribute("position", new Float32BufferAttribute(motePositions, 3));
  moteGeometry.setAttribute("aSeed", new Float32BufferAttribute(moteSeeds, 1));
  const moteUniforms = {
    uPixelRatio: floorUniforms.uPixelRatio,
    uTime: { value: 0 },
    uColour: { value: new Color() },
    uOpacity: { value: 0.3 },
  };
  const moteMaterial = new ShaderMaterial({
    uniforms: moteUniforms,
    vertexShader: MOTE_VERTEX,
    fragmentShader: MOTE_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
  scene.add(new Points(moteGeometry, moteMaterial));

  // ----- Bead line (the route) and bubbles (beside each stop): one instanced set of glass -----

  const MAX_GLASS = 320;
  const glassSet = new InstancedMesh(new SphereGeometry(1, 28, 18), beadGlass, MAX_GLASS);
  glassSet.instanceMatrix.setUsage(DynamicDrawUsage);
  glassSet.frustumCulled = false;
  glassSet.count = 0;
  scene.add(glassSet);

  interface Bead {
    p: Vector3;
    dist: number;
    stop: number;
  }
  interface Bubble {
    p: Vector3;
    r: number;
    stop: number;
    seed: number;
    accent: boolean;
  }
  let beads: Bead[] = [];
  let bubbles: Bubble[] = [];
  let routeCurve: CatmullRomCurve3 | null = null;
  let routeLength = 1;
  /** Route distance at each stop (index 0 is the start, then stop 1 to n). */
  let routeAtStop: number[] = [];
  const BEAD_STEP = 0.75;
  const BEAD_R = 0.075;

  const buildGlass = (phone: boolean) => {
    const first = stops[0]?.position ?? new Vector3();
    const points = [
      new Vector3(first.x - 1.5, FLOOR + BEAD_R, first.z + 30),
      ...stops.map((s) => new Vector3(s.position.x, FLOOR + BEAD_R, s.position.z)),
    ];
    const end = points[points.length - 1] ?? new Vector3();
    points.push(new Vector3(end.x, FLOOR + BEAD_R, end.z - 10));
    routeCurve = new CatmullRomCurve3(points, false, "centripetal");
    routeLength = routeCurve.getLength();
    // Route distance of each control point, from the nearest sample (samples spaced by length).
    routeAtStop = points.slice(0, -1).map((pt) => {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i <= 600; i += 1) {
        const d = routeCurve?.getPointAt(i / 600).distanceToSquared(pt) ?? Infinity;
        if (d < bestD) {
          bestD = d;
          best = (i / 600) * routeLength;
        }
      }
      return best;
    });
    beads = [];
    for (let dist = 0; dist < routeLength && beads.length < MAX_GLASS - 40; dist += BEAD_STEP) {
      const p = routeCurve.getPointAt(dist / routeLength);
      let stop = routeAtStop.findIndex((d) => d >= dist) - 1;
      if (stop < 0) stop = dist <= 0 ? 0 : stops.length - 1;
      beads.push({ p, dist, stop: Math.min(stops.length - 1, Math.max(0, stop)) });
    }
    bubbles = [];
    stops.forEach((s, i) => {
      // Out beyond the visual's outer edge and a little behind it, never over the copy.
      const out = phone ? 0.4 : s.halfWidth + 0.9;
      const spread = phone ? 0.6 : 1;
      const set: [number, number, number, number, boolean][] = [
        [out + 0.3, 0.9, -2.2, 0.42, false],
        [out + 1.4, -0.4, -3.6, 0.6, true],
        [out + 0.1, -1.5, -1.4, 0.24, true],
        [out + 2.3, 1.4, -5.2, 0.34, false],
        [out - 0.6, 2.0, -3.0, 0.18, false],
      ];
      const sx = phone ? (i % 2 ? -1 : 1) : s.side;
      for (const [dx, dy, dz, r, accent] of set)
        bubbles.push({
          p: new Vector3(
            s.position.x + sx * dx * spread,
            s.position.y + dy * spread,
            s.position.z + dz,
          ),
          r: r * (phone ? 0.75 : 1),
          stop: i,
          seed: Math.random() * Math.PI * 2,
          accent,
        });
    });
    glassSet.count = beads.length + bubbles.length;
    paintGlass();
  };

  const instanceTint = new Color();
  const white = new Color(1, 1, 1);
  const paintGlass = () => {
    const dark = isDarkCache;
    beads.forEach((b, i) => {
      const tone = stops[b.stop]?.tone ?? white;
      instanceTint.copy(white).lerp(tone, dark ? 0.85 : 0.92);
      glassSet.setColorAt(i, instanceTint);
    });
    bubbles.forEach((b, i) => {
      const s = stops[b.stop];
      const tone = (b.accent ? s?.accent : s?.tone) ?? white;
      instanceTint.copy(white).lerp(tone, dark ? 0.85 : 0.9);
      glassSet.setColorAt(beads.length + i, instanceTint);
    });
    if (glassSet.instanceColor) glassSet.instanceColor.needsUpdate = true;
  };

  // ----- Scroll anchors and camera poses -----

  let anchors: number[] = [];
  let poses: Pose[] = [];
  let phone = false;
  let headerHeight = 0;

  const measure = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    const vh = window.innerHeight;
    headerHeight = document.querySelector("header")?.offsetHeight ?? 0;
    const depth = (SCALE * height) / (2 * TAN);
    const jr = journey.getBoundingClientRect();
    const journeyTop = jr.top + window.scrollY;
    const journeyBottom = jr.bottom + window.scrollY;
    // Where the sticky layer's top is in the viewport when the page is scrolled to `scroll`.
    const layerTop = (scroll: number) =>
      Math.min(Math.max(0, journeyTop - scroll), journeyBottom - scroll - height);
    anchors = [
      intro ? intro.getBoundingClientRect().top + window.scrollY - headerHeight : journeyTop - vh,
    ];
    poses = [];
    sections.forEach((section, i) => {
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const anchor = sectionTop - headerHeight;
      anchors.push(anchor);
      const still = section.querySelector<HTMLElement>("[data-stop-card]");
      const stop = stops[i];
      if (!still || !stop) return;
      const r = still.getBoundingClientRect();
      const cardTop = r.top + window.scrollY - anchor - layerTop(anchor);
      const nx = ((r.left + r.width / 2) / width) * 2 - 1;
      const ny = 1 - ((cardTop + r.height / 2) / height) * 2;
      poses.push({
        x: stop.position.x - nx * depth * TAN * aspect,
        y: stop.position.y - ny * depth * TAN,
        z: stop.position.z + depth,
      });
    });
    // The opening pose: further back, the first visual small, beside or below the intro copy.
    const first = stops[0]?.position ?? new Vector3();
    const startDepth = depth + (phone ? 20 : 15);
    const startNx = intro ? (phone ? 0.1 : 0.42) : 0;
    const startNy = intro ? (phone ? -0.5 : -0.18) : 0;
    poses.unshift({
      x: first.x - startNx * startDepth * TAN * aspect,
      y: first.y - startNy * startDepth * TAN + 0.6,
      z: first.z + startDepth,
    });
    const bh = 2 * 150 * TAN;
    backdrop.scale.set(bh * aspect * 1.2, bh * 1.2, 1);
  };

  const rebuild = () => {
    phone = container.clientWidth < 768;
    buildCards();
    refreshColours();
    buildGlass(phone);
    measure();
  };

  let lastWidthBucket = -1;
  stage.onResize(({ width, height }) => {
    const bucket = width < 768 ? 0 : 1;
    css.setSize(width, height);
    floorUniforms.uPixelRatio.value = renderer.getPixelRatio();
    if (bucket !== lastWidthBucket) {
      lastWidthBucket = bucket;
      rebuild();
    } else {
      measure();
    }
  });
  const journeyObserver = new ResizeObserver(() => measure());
  journeyObserver.observe(journey);
  document.fonts?.ready.then(() => {
    if (lastWidthBucket >= 0) rebuild();
  });

  // ----- Colours -----

  let isDarkCache = isDark();
  const orbTone = new Color();
  const orbTarget = new Color();

  const refreshColours = () => {
    isDarkCache = isDark();
    const dark = isDarkCache;
    const canvas = tokenColour("--colors-surface-canvas");
    const mark = tokenColour(dark ? "--colors-primary-mark-lit" : "--colors-primary");
    backdropMaterial.color.copy(canvas);
    floorUniforms.uCanvas.value.copy(canvas);
    floorUniforms.uColour.value.copy(
      tokenColour(dark ? "--colors-border" : "--colors-text-secondary"),
    );
    floorUniforms.uLitColour.value.copy(mark);
    floorUniforms.uOpacity.value = dark ? 0.75 : 0.4;
    moteUniforms.uColour.value.copy(mark);
    moteUniforms.uOpacity.value = dark ? 0.4 : 0.25;
    moteMaterial.blending = dark ? AdditiveBlending : NormalBlending;
    moteMaterial.needsUpdate = true;
    for (const stop of stops) {
      stop.tone.copy(tokenColour(TONES[stop.key] ?? "--colors-primary"));
      stop.accent.copy(tokenColour(ACCENTS[stop.key] ?? "--colors-chart-series6"));
      stop.light.color.copy(stop.tone);
    }
    const sheen = tokenColour("--colors-primary-mark");
    for (const m of [beadGlass, orbGlass]) {
      m.sheenColor.copy(sheen);
      // The room's grey walls wash out pale glass on Mint, so Mint takes less of them.
      m.envMapIntensity = dark ? 1.3 : 0.7;
      m.emissive.copy(white);
      m.emissiveIntensity = dark ? 0.025 : 0;
      // On Midnight the glass refracts a dark canvas, so it keeps more of its own coloured body.
      m.transmission = dark ? 0.74 : 0.92;
      m.roughness = dark ? 0.08 : 0.05;
    }
    beadGlass.attenuationColor.copy(white).lerp(mark, 0.35);
    shadowMaterial.color.copy(
      tokenColour(dark ? "--colors-primary-mark" : "--colors-text-primary"),
    );
    shadowMaterial.blending = dark ? AdditiveBlending : NormalBlending;
    shadowMaterial.needsUpdate = true;
    key.intensity = dark ? 1.3 : 1.8;
    if (beads.length) paintGlass();
  };

  // ----- Frame -----

  let s = -1;
  const head = new Vector3();
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const scaleV = new Vector3();
  const pos = new Vector3();

  const progressFromScroll = () => {
    const y = window.scrollY;
    const n = anchors.length - 1;
    if (n < 1) return 0;
    if (y <= (anchors[0] ?? 0)) return 0;
    for (let i = 0; i < n; i += 1) {
      const a = anchors[i] ?? 0;
      const b = anchors[i + 1] ?? a + 1;
      if (y < b) return i + (y - a) / Math.max(1, b - a);
    }
    return n;
  };

  /** Route distance for a scroll progress (0 the start, k at stop k). */
  const routeDistance = (progress: number) => {
    if (routeAtStop.length < 2) return 0;
    const i = Math.min(Math.floor(progress), routeAtStop.length - 2);
    const from = routeAtStop[i] ?? 0;
    const to = routeAtStop[i + 1] ?? from;
    return from + (to - from) * clamp01(progress - i);
  };

  /** How long each kind's own moment lasts, in Calm milliseconds. */
  const momentLength = (stop: Stop) => {
    switch (stop.kind) {
      case "list":
        return TIMING.entry + TIMING.stagger * Math.max(0, stop.bars.length - 1);
      case "payslip":
        return TIMING.disclosure * 2.6;
      case "chart":
        return TIMING.chart + TIMING.entry * 0.5;
      case "count":
        return TIMING.count;
      case "dashboard":
        return TIMING.count + TIMING.stagger * 2;
      default:
        return 0;
    }
  };

  const playMoment = (stop: Stop) => {
    const t = stop.elapsed;
    if (Math.abs(t - stop.lastElapsed) < 0.5) return;
    stop.lastElapsed = t;
    // Figures count, eased out, the way CountTo does on the still page.
    stop.counts.forEach((c, i) => {
      const start = stop.kind === "chart" ? TIMING.chart * 0.15 : i * TIMING.stagger;
      const e = 1 - (1 - clamp01((t - start) / TIMING.count)) ** 3;
      const text = COUNT_FORMATS[c.format](c.value * e);
      if (text !== c.last) {
        c.last = text;
        c.el.textContent = text;
      }
    });
    stop.bars.forEach((bar, i) => {
      const e = calm(clamp01((t - i * TIMING.stagger) / TIMING.entry));
      bar.style.transform = `scaleX(${e.toFixed(3)})`;
    });
    for (const path of stop.draws)
      path.style.strokeDashoffset = (1 - calmInOut(clamp01(t / TIMING.chart))).toFixed(4);
    const fade = calm(clamp01((t - TIMING.chart * 0.8) / (TIMING.entry * 0.6)));
    for (const f of stop.fades) f.style.opacity = fade.toFixed(3);
    // The payslip: the lower third swings out from behind, then the top third off the front.
    const folds: [Fold | undefined, number][] = [
      [stop.folds.bottom, 1 - calmInOut(clamp01(t / (TIMING.disclosure * 1.4)))],
      [
        stop.folds.top,
        1 - calmInOut(clamp01((t - TIMING.disclosure * 1.1) / (TIMING.disclosure * 1.5))),
      ],
    ];
    for (const [fold, f] of folds) {
      if (!fold) continue;
      const angle = Math.PI * 0.985 * f;
      fold.hinge.rotation.x = angle;
      const showing = angle < Math.PI / 2 ? 1 : 0;
      if (showing !== fold.showing) {
        fold.showing = showing;
        fold.face.style.visibility = showing ? "" : "hidden";
        fold.back.style.visibility = showing ? "hidden" : "";
      }
      const shade = Math.round(Math.sin(angle) * 0.5 * 50) / 50;
      if (fold.shade && shade !== fold.lastShade) {
        fold.lastShade = shade;
        fold.shade.style.opacity = String(shade);
      }
    }
  };

  const setOpacity = (stop: Stop, value: number) => {
    if (value === stop.lastOpacity) return;
    stop.lastOpacity = value;
    if (stop.kind === "payslip") {
      const els = [
        stop.folds.middle,
        ...(stop.folds.top?.elements ?? []),
        ...(stop.folds.bottom?.elements ?? []),
      ];
      for (const el of els) if (el) el.style.opacity = String(value);
    } else {
      stop.frame.element.style.opacity = String(value);
    }
  };

  stage.onFrame(({ dt, t }) => {
    if (poses.length < 2) return;
    const factor = getPace();
    const target = progressFromScroll();
    // The camera follows scroll softly; a calmer pace follows more gently.
    s = s < 0 ? target : s + (target - s) * (1 - Math.exp((-dt * 3.4) / factor));
    moteUniforms.uTime.value = t;

    const n = poses.length - 1;
    const i = Math.min(Math.floor(s), n - 1);
    const f = clamp01(s - i);
    const e = calmInOut(f) * 0.75 + f * 0.25;
    const a = poses[i];
    const b = poses[i + 1] ?? a;
    if (!a || !b) return;
    const arc = Math.sin(Math.PI * e);
    const dir = Math.sign(b.x - a.x) || 1;
    // Frame the arriving visual: it moves from where it was seen to where it lands, and its
    // distance closes, so it stays in view the whole way (on phones too).
    const arriving = stops[i]?.position;
    if (arriving) {
      const aspect = camera.aspect;
      const limit = 0.62;
      const depthA = Math.max(1, a.z - arriving.z);
      const depthB = Math.max(1, b.z - arriving.z);
      const clampN = (v: number) => Math.max(-limit, Math.min(limit, v));
      const nxA = clampN((arriving.x - a.x) / (depthA * TAN * aspect));
      const nyA = clampN((arriving.y - a.y) / (depthA * TAN));
      const nxB = (arriving.x - b.x) / (depthB * TAN * aspect);
      const nyB = (arriving.y - b.y) / (depthB * TAN);
      const depth = depthA + (depthB - depthA) * e;
      const nx = nxA + (nxB - nxA) * e;
      // On a phone the panels scroll through the upper half mid-flight, so the arriving visual
      // dips into the clear lower half and rises to its place as its section arrives.
      const ny = nyA + (nyB - nyA) * e - (phone && i > 0 ? Math.sin(Math.PI * e) * 0.8 : 0);
      const framed = {
        x: arriving.x - nx * depth * TAN * aspect,
        y: arriving.y - ny * depth * TAN,
        z: arriving.z + depth,
      };
      const w = smooth(e / 0.3);
      camera.position.set(
        a.x + (framed.x - a.x) * w,
        a.y + (framed.y - a.y) * w + arc * 0.3,
        a.z + (framed.z - a.z) * w,
      );
    }
    // A slight roll into the turn mid-flight, square again at every stop.
    camera.rotation.set(0, 0, -dir * arc * 0.02);

    // ----- The orb rolls along the route with the reader, out beside the arriving visual -----
    const along = routeDistance(s);
    routeCurve?.getPointAt(clamp01(along / routeLength), head);
    floorUniforms.uHead.value.copy(head);
    const near = stops[Math.min(stops.length - 1, Math.max(0, Math.ceil(s) - 1))];
    const prev = stops[Math.min(stops.length - 1, Math.max(0, Math.floor(s) - 1))];
    const blend = calmInOut(clamp01(s - Math.floor(s)));
    const sideNow = (prev?.side ?? 1) + ((near?.side ?? 1) - (prev?.side ?? 1)) * blend;
    const out = phone ? 0.9 : (near?.halfWidth ?? 1.6) + 0.6;
    const bob = Math.sin(t * 0.8) * 0.06;
    orb.position.set(head.x + sideNow * out, FLOOR + ORB_R + 0.25 + bob, head.z - 1.2);
    orb.rotation.set(-along / ORB_R, t * 0.05, 0);
    shadow.position.set(orb.position.x, FLOOR + 0.012, orb.position.z);
    shadow.scale.setScalar(ORB_R * (2.6 - bob * 2));
    shadowMaterial.opacity = isDarkCache ? 0.18 : 0.22;
    // Its tint follows the stop ahead, a slow change of colour as the reader travels.
    orbTarget.copy(near?.tone ?? white);
    orbTone.lerp(orbTarget, 1 - Math.exp((-dt * 1.6) / factor));
    orbGlass.attenuationColor.copy(white).lerp(orbTone, isDarkCache ? 0.75 : 0.85);
    orbGlass.color.copy(white).lerp(orbTone, 0.65);

    // ----- Bead line: beads ahead wait small, and grow as the orb passes them -----
    beads.forEach((bead, index) => {
      const g = smooth((along - bead.dist + 2.5) / 2.5);
      const r = BEAD_R * (0.4 + 0.6 * g);
      pos.copy(bead.p);
      pos.y = FLOOR + r;
      scaleV.setScalar(r);
      matrix.compose(pos, quaternion, scaleV);
      glassSet.setMatrixAt(index, matrix);
    });
    bubbles.forEach((bubble, index) => {
      // A stop's bubbles rise into being as the reader nears it, and stay once passed.
      const grow = smooth((s - bubble.stop + 0.6) / 1.2);
      const lift = Math.sin(t * 0.5 + bubble.seed) * 0.12 - (1 - grow) * 0.8;
      pos.copy(bubble.p);
      pos.y += lift;
      scaleV.setScalar(Math.max(1e-4, bubble.r * grow));
      matrix.compose(pos, quaternion, scaleV);
      glassSet.setMatrixAt(beads.length + index, matrix);
    });
    glassSet.instanceMatrix.needsUpdate = true;

    // ----- Each stop: parts come together on scroll, then its moment plays on time -----
    for (const [index, stop] of stops.entries()) {
      const kk = index + 1;
      const d = s - kk;
      const window = 0.9 * factor + 0.1;
      const apart = smooth(-d / window);
      const ahead = kk === 1 ? 1 : clamp01(1 - (-d - 0.5) * 1.3);
      const passed = 1 - smooth((d - 0.05) / 0.3);
      const clearance = smooth((camera.position.z - stop.position.z - 5) / 4);
      const opacity = Math.min(ahead, passed) * clearance;
      const visible = opacity > 0.01 && stop.position.z < camera.position.z - 1.2;
      stop.light.intensity = (1 - smooth(Math.abs(d) / 1.1)) * (isDarkCache ? 26 : 34);

      // The moment runs forwards once the stop is reached, and resets when far before it.
      const length = momentLength(stop);
      if (d > -0.15) stop.elapsed = Math.min(length, stop.elapsed + (dt * 1000) / factor);
      else if (d < -0.7) stop.elapsed = 0;

      stop.group.visible = visible;
      if (!visible) continue;
      stop.group.rotation.y = -stop.side * apart * 0.07;
      stop.frame.position.set(0, 0, -apart * 40);
      setOpacity(stop, Math.round(opacity * (1 - apart * 0.3) * 50) / 50);
      if (stop.kind === "payslip") stop.group.position.z = stop.position.z - apart * 0.4;
      for (const part of stop.parts) {
        const partApart = smooth((-d - part.lead * window) / (0.6 * window));
        part.object.position.set(
          part.base.x + part.away.x * partApart,
          part.base.y + part.away.y * partApart,
          part.base.z + part.away.z * partApart,
        );
        part.object.rotation.y = part.turn * partApart;
        const partOpacity = Math.round(opacity * (1 - smooth((partApart - 0.2) / 0.4)) * 50) / 50;
        if (partOpacity !== part.last) {
          part.last = partOpacity;
          part.object.element.style.opacity = String(partOpacity);
        }
      }
      if (length > 0) playMoment(stop);
    }
    css.render(scene, camera);
  });

  return {
    refreshColours,
    dispose: () => {
      journeyObserver.disconnect();
      disposeCards();
      css.domElement.remove();
      shadowTexture.dispose();
      stage.dispose();
    },
  };
}
