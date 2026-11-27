import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
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
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Points,
  Quaternion,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { OrbTone } from "../../components/GlassOrb/GlassOrb";
import type { SceneHandle, SceneVerdict } from "../../components/SceneStage/SceneStage";
import {
  clamp01,
  colourMixAt,
  piecewise,
  progressFromScroll,
  restShare,
  smooth,
  waypointProgress,
} from "./journeyRoute";

/*
 * The journey's travelling layer (three.js 0.187.0, UX-GUIDELINES MK12), ported from prototype
 * 11's `journeyScene.ts` and `shared/threeKit.ts`. Only reached by `loadJourneyScene`'s dynamic
 * import, after first paint, never under reduced motion, and only when `useScenePower` says live.
 *
 * A winding bead line on a lit floor lattice, curving from side to side into the distance; a large
 * glass orb rolls along it with scroll in the lane under each stop's frame, so it never crosses a
 * card or text (MK8); the camera follows a little behind and above, leaning into the turns. Beside
 * every stop a cluster of glass bubbles rises in the stop's two colours, and a light in its colour
 * warms the glass as the orb passes. Each stop has its own colour and an accent from the other set;
 * the orb turns to the accent through the rest and reaches the next stop in its colour (debt keeps
 * sky and teal: `journeyStops.ts`). Colours are the orb tokens and page tokens, read from the page
 * as computed CSS colours (`JourneyPalette`), never written here.
 *
 * Set-up runs in small steps, one task each, so no main-thread task is long. Rendering pauses in a
 * hidden tab, while the journey is off screen and while ambient motion is paused (MK14); paused,
 * the orb still keeps its place on scroll, one still frame per scroll. The frame rate check drops
 * to a pixel ratio of 1, then gives up (the still comes back).
 */

/** The page's colours the scene needs, as computed CSS colour strings. */
export interface JourneyPalette {
  /** The four orb colours (`orb.skyTeal.*`, `orb.violetRose.*`). */
  readonly tones: Readonly<Record<OrbTone, string>>;
  /** The journey's background, `surface.canvas`: the backdrop, and Midnight or Mint. */
  readonly canvas: string;
  /** The floor lattice's ink. */
  readonly floor: string;
  /** Text ink, for the orb's shadow on Mint. */
  readonly ink: string;
  /** The mint, a faint tint in the bubbles' glass. */
  readonly primary: string;
}

export interface JourneySceneOptions {
  /** The stage the canvas fills. */
  readonly container: HTMLElement;
  /** The journey: its stops (`[data-journey-stop]`, `[data-stop-frame]`) set the route. */
  readonly journey: HTMLElement;
  /** Each stop's two orb colours, in stop order. */
  readonly stopTones: readonly (readonly [OrbTone, OrbTone])[];
  readonly palette: () => JourneyPalette;
  readonly frameCheck: { tick(now: number): SceneVerdict | null; reset(): void };
  readonly running: boolean;
  readonly onVerdict: (verdict: SceneVerdict) => void;
  readonly onLost: () => void;
  readonly onFirstFrame: () => void;
}

const FOV = 35;
const TAN = Math.tan((FOV * Math.PI) / 360);
/** World depth between stops. */
const GAP = 15;
/** How far behind the orb the camera rides. */
const DIST = 11;
/** How much of the orb's sideways travel the camera follows. */
const FOLLOW = 0.6;
/** The marketing site's calm pace (prototype 11's timings times 1.4): how gently the orb follows. */
const PACE = 1.4;
const START_S = -1.4;
const TONE_NAMES: readonly OrbTone[] = ["sky", "violet", "teal", "rose"];

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
    gl_PointSize = uSize * uPixelRatio * (1.0 + vLit * 0.8) / max(vDepth, 0.5) * 10.0;
    gl_Position = projectionMatrix * mv;
  }
`;

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
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float edge = 1.0 - smoothstep(0.3, 0.5, r);
    float fade = (1.0 - smoothstep(uFar * 0.45, uFar, vDepth)) * smoothstep(0.8, 3.0, vDepth);
    float a = clamp(uOpacity * edge * fade * (0.55 + 0.45 * vSeed + vLit * 1.5), 0.0, 1.0);
    if (a < 0.01) discard;
    vec3 ink = mix(uColour, uLitColour, clamp(vLit * 1.4, 0.0, 1.0));
    gl_FragColor = vec4(mix(uCanvas, ink, a), 1.0);
    #include <colorspace_fragment>
  }
`;

/** Slow rising motes in the four orb colours. */
const MOTE_VERTEX = /* glsl */ `
  attribute float aSeed;
  attribute float aTone;
  uniform float uPixelRatio;
  uniform float uTime;
  varying float vDepth;
  varying float vSeed;
  varying float vTone;
  void main() {
    vec3 p = position;
    p.y += mod(uTime * 0.09 + aSeed * 9.0, 6.5);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    vSeed = aSeed;
    vTone = aTone;
    gl_PointSize = 14.0 * uPixelRatio / max(vDepth, 0.5);
    gl_Position = projectionMatrix * mv;
  }
`;

const MOTE_FRAGMENT = /* glsl */ `
  uniform vec3 uTones[4];
  uniform float uOpacity;
  varying float vDepth;
  varying float vSeed;
  varying float vTone;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float fade = (1.0 - smoothstep(18.0, 40.0, vDepth)) * smoothstep(2.0, 5.0, vDepth);
    int i = int(vTone + 0.5);
    vec3 c = i == 0 ? uTones[0] : i == 1 ? uTones[1] : i == 2 ? uTones[2] : uTones[3];
    gl_FragColor = vec4(c, uOpacity * fade * (1.0 - r * 2.0) * (0.4 + 0.6 * vSeed));
    #include <colorspace_fragment>
  }
`;

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

const luminance = (c: Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/** A soft round alpha mask, for the orb's shadow on the floor. */
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
 * A coloured Fresnel rim and a faint body glow on the glass: tinted at the edge, the way coloured
 * glass reads against a dark room. Instanced glass takes each instance's colour.
 */
function addRim(
  material: MeshPhysicalMaterial,
  rim: { colour: Color; strength: { value: number }; glow: { value: number } },
) {
  const uniforms = {
    uRimColour: { value: rim.colour },
    uRimStrength: rim.strength,
    uGlow: rim.glow,
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "uniform vec3 uRimColour;\nuniform float uRimStrength;\nuniform float uGlow;\nvoid main() {",
      )
      .replace(
        "#include <opaque_fragment>",
        `{
          float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.2);
          #ifdef USE_INSTANCING_COLOR
            vec3 rimTint = vColor;
          #else
            vec3 rimTint = uRimColour;
          #endif
          outgoingLight += rimTint * (rimF * uRimStrength + uGlow);
        }
        #include <opaque_fragment>`,
      );
  };
}

export async function createJourneyScene(options: JourneySceneOptions): Promise<SceneHandle> {
  const { container, journey, frameCheck } = options;
  let disposed = false;
  let running = options.running;

  // ----- Step 1: the renderer, its canvas and the camera -----

  const renderer = new WebGLRenderer({
    antialias: window.devicePixelRatio < 2,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.journeyCanvas = "";
  container.appendChild(canvas);
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 200);
  scene.add(camera);
  await nextTask();

  // ----- Step 2: the room the glass reflects (three.js's own RoomEnvironment) -----

  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  scene.environment = environment;
  await nextTask();

  // ----- Step 3: backdrop, lights, glass, floor, motes, beads and bubbles -----

  const sections = Array.from(journey.querySelectorAll<HTMLElement>("[data-journey-stop]"));
  const stopCount = Math.max(1, sections.length);
  const stopTone = (k: number) =>
    options.stopTones[Math.max(0, Math.min(stopCount - 1, k))] ?? (["sky", "violet"] as const);
  const tones = TONE_NAMES.map(() => new Color());
  const toneOf = (name: OrbTone) => tones[TONE_NAMES.indexOf(name)] ?? white;
  const white = new Color(1, 1, 1);

  // An opaque backdrop in the canvas colour, so the glass has something to refract.
  const backdropMaterial = new MeshBasicMaterial({ toneMapped: false, depthWrite: false });
  const backdrop = new Mesh(new PlaneGeometry(1, 1), backdropMaterial);
  backdrop.position.z = -150;
  backdrop.renderOrder = -10;
  camera.add(backdrop);

  const key = new DirectionalLight(new Color(1, 1, 1), 1.6);
  key.position.set(-4, 8, 6);
  scene.add(key);
  const rimA = new PointLight(new Color(1, 1, 1), 0, 10, 1.6);
  const rimB = new PointLight(new Color(1, 1, 1), 0, 10, 1.6);
  scene.add(rimA, rimB);
  const stopLights = sections.map(() => {
    const light = new PointLight(new Color(1, 1, 1), 0, 14, 1.6);
    scene.add(light);
    return light;
  });

  const glass = {
    transmission: 1,
    ior: 1.5,
    roughness: 0.04,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    specularIntensity: 1,
    iridescence: 0.18,
    iridescenceIOR: 1.3,
  };
  const orbGlass = new MeshPhysicalMaterial({
    ...glass,
    thickness: 1.1,
    attenuationDistance: 0.8,
    dispersion: 0.3,
  });
  const beadGlass = new MeshPhysicalMaterial({
    ...glass,
    iridescence: 0,
    thickness: 0.5,
    attenuationDistance: 0.8,
  });
  const bubbleGlass = new MeshPhysicalMaterial({
    ...glass,
    thickness: 0.6,
    attenuationDistance: 0.9,
  });
  const orbRim = { colour: new Color(1, 1, 1), strength: { value: 0.9 }, glow: { value: 0 } };
  addRim(orbGlass, orbRim);
  const beadRim = { colour: white, strength: { value: 0.7 }, glow: { value: 0 } };
  addRim(beadGlass, beadRim);
  const bubbleRim = { colour: white, strength: { value: 0.8 }, glow: { value: 0 } };
  addRim(bubbleGlass, bubbleRim);

  // The glass waits outside the scene until its shaders are compiled (compileAsync), so the first
  // frames do not stall on three physical glass programs.
  const glassGroup = new Group();
  const orb = new Mesh(new SphereGeometry(1, 64, 44), orbGlass);
  glassGroup.add(orb);
  const shadowTexture = softDot();
  const shadowMaterial = new MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const shadow = new Mesh(new PlaneGeometry(1, 1), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  let floorY = -2.8;
  let orbR = 0.6;
  let camH = 2.6;
  let amplitude = 4;
  let phone = false;
  const zNear = GAP * 2;
  const zFar = -(stopCount + 2) * GAP;
  const endS = stopCount - 1 + 1.8;

  const floorUniforms = {
    uSize: { value: 2.3 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uHead: { value: new Vector3() },
    uCanvas: { value: new Color() },
    uColour: { value: new Color() },
    uLitColour: { value: new Color() },
    uOpacity: { value: 0.5 },
    uFar: { value: 46 },
  };
  const floorGeometry = new BufferGeometry();
  scene.add(
    new Points(
      floorGeometry,
      new ShaderMaterial({
        uniforms: floorUniforms,
        vertexShader: FLOOR_VERTEX,
        fragmentShader: FLOOR_FRAGMENT,
      }),
    ),
  );
  const buildFloor = () => {
    const positions: number[] = [];
    const seeds: number[] = [];
    for (let z = zNear; z >= zFar - 20; z -= 1.1) {
      for (let x = -24; x <= 24; x += 1.1) {
        positions.push(x, floorY, z);
        seeds.push(Math.random());
      }
    }
    floorGeometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    floorGeometry.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1));
    floorGeometry.computeBoundingSphere();
  };

  const moteGeometry = new BufferGeometry();
  const moteUniforms = {
    uPixelRatio: floorUniforms.uPixelRatio,
    uTime: { value: 0 },
    uTones: { value: tones },
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
  const buildMotes = () => {
    const positions: number[] = [];
    const seeds: number[] = [];
    const toneIds: number[] = [];
    for (let i = 0; i < 200; i += 1) {
      positions.push(
        (Math.random() - 0.5) * 30,
        floorY + Math.random() * 1.6,
        zNear - Math.random() * (zNear - zFar),
      );
      seeds.push(Math.random());
      toneIds.push(i % 4);
    }
    moteGeometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    moteGeometry.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1));
    moteGeometry.setAttribute("aTone", new Float32BufferAttribute(toneIds, 1));
    moteGeometry.computeBoundingSphere();
  };

  // ----- The route: a winding curve through one waypoint per stop -----

  let route: CatmullRomCurve3 | null = null;
  let routeLength = 1;
  /** Route distance of each waypoint (start, stop 1 to n, end). */
  let routeAt: number[] = [];
  /** Journey progress of each waypoint. */
  let waypointS: number[] = [];
  let restShares: number[] = [];

  const buildRoute = () => {
    const pts = [new Vector3(0, floorY, -START_S * GAP)];
    for (let k = 0; k < stopCount; k += 1) {
      const side = k % 2 === 0 ? -1 : 1;
      pts.push(new Vector3(side * amplitude, floorY, -(k + 0.3) * GAP));
    }
    pts.push(new Vector3(0, floorY, -endS * GAP));
    const curve = new CatmullRomCurve3(pts, false, "centripetal");
    route = curve;
    routeLength = curve.getLength();
    routeAt = pts.map((pt) => {
      let best = 0;
      let bestD = Number.POSITIVE_INFINITY;
      for (let i = 0; i <= 800; i += 1) {
        const d = curve.getPointAt(i / 800).distanceToSquared(pt);
        if (d < bestD) {
          bestD = d;
          best = (i / 800) * routeLength;
        }
      }
      return best;
    });
  };

  const colourAt = (s: number, out: Color) => {
    const { from, to, t } = colourMixAt(s, restShares, stopCount);
    const a = toneOf(stopTone(from.stop)[from.role]);
    const b = toneOf(stopTone(to.stop)[to.role]);
    return out.copy(a).lerpHSL(b, t);
  };

  const MAX_BEADS = 420;
  const BEAD_STEP = 0.6;
  const BEAD_R = 0.075;
  const sphere = new SphereGeometry(1, 24, 16);
  const beadSet = new InstancedMesh(sphere, beadGlass, MAX_BEADS);
  beadSet.instanceMatrix.setUsage(DynamicDrawUsage);
  beadSet.frustumCulled = false;
  beadSet.count = 0;
  glassGroup.add(beadSet);
  let beads: { p: Vector3; d: number }[] = [];

  const MAX_BUBBLES = 8 * 8;
  const bubbleSet = new InstancedMesh(sphere, bubbleGlass, MAX_BUBBLES);
  bubbleSet.instanceMatrix.setUsage(DynamicDrawUsage);
  bubbleSet.frustumCulled = false;
  bubbleSet.count = 0;
  glassGroup.add(bubbleSet);
  let bubbles: { p: Vector3; r: number; stop: number; seed: number; accent: boolean }[] = [];

  const buildBeads = () => {
    beads = [];
    const curve = route;
    if (!curve) return;
    for (let d = 0; d < routeLength && beads.length < MAX_BEADS; d += BEAD_STEP) {
      beads.push({ p: curve.getPointAt(d / routeLength), d });
    }
    beadSet.count = beads.length;
  };

  let dark = false;
  const tint = new Color();
  const paintBubbles = () => {
    bubbles.forEach((b, i) => {
      const [own, accent] = stopTone(b.stop);
      tint.copy(white).lerp(toneOf(b.accent ? accent : own), dark ? 1 : 0.88);
      bubbleSet.setColorAt(i, tint);
    });
    if (bubbleSet.instanceColor) bubbleSet.instanceColor.needsUpdate = true;
  };

  const buildBubbles = () => {
    bubbles = [];
    const aspect = camera.aspect || 1;
    for (let k = 0; k < stopCount; k += 1) {
      const side = k % 2 === 0 ? -1 : 1;
      const wx = side * amplitude;
      const wz = -(k + 0.3) * GAP;
      // Out at both edges of the screen as the camera passes, behind the stop, never mid-screen:
      // [edge side, share of half width, height above floor, depth behind, radius, accent].
      const set: [number, number, number, number, number, boolean][] = [
        [1, 0.78, 2.1, 3, 0.55, false],
        [1, 1.02, 3.4, 6, 0.4, true],
        [1, 0.66, 4.4, 4.5, 0.24, true],
        [-1, 0.82, 3.0, 4, 0.48, true],
        [-1, 1.05, 1.6, 6.5, 0.62, false],
        [-1, 0.7, 4.2, 5.5, 0.22, false],
      ];
      for (const [edge, share, up, back, r, accent] of set) {
        const half = (DIST + back) * TAN * aspect;
        bubbles.push({
          p: new Vector3(
            wx * FOLLOW + edge * side * half * share * (phone ? 0.9 : 1),
            floorY + up * (phone ? 1.25 : 1),
            wz - back,
          ),
          r: r * (phone ? 0.6 : 1),
          stop: k,
          seed: Math.random() * Math.PI * 2,
          accent,
        });
      }
    }
    bubbleSet.count = bubbles.length;
    paintBubbles();
  };

  // ----- Scroll: each stop's anchor is where its frame starts to hold -----

  let anchors: number[] = [];
  const measure = () => {
    const vh = window.innerHeight;
    const journeyTop = journey.getBoundingClientRect().top + window.scrollY;
    const frames = sections.map((section) =>
      section.querySelector<HTMLElement>("[data-stop-frame]"),
    );
    anchors = sections.map((section, i) => {
      const frame = frames[i];
      const stickyTop = frame ? Number.parseFloat(getComputedStyle(frame).top) || 0 : 0;
      return section.getBoundingClientRect().top + window.scrollY - stickyTop;
    });
    const first = anchors[0] ?? journeyTop;
    const unit = Math.max(1, (anchors[1] ?? first + vh) - first);
    restShares = sections.map((_section, i) => {
      const start = anchors[i] ?? first;
      const span = Math.max(1, (anchors[i + 1] ?? start + unit) - start);
      const frame = frames[i];
      const beat = frame ? -(Number.parseFloat(getComputedStyle(frame).marginTop) || 0) : 0;
      return restShare(span, beat);
    });
    anchors.unshift(first - unit);
    anchors.push((anchors.at(-1) ?? first) + unit);
    waypointS = waypointProgress(restShares, START_S, endS);
  };

  const layout = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    phone = width < 768;
    const halfH = DIST * TAN;
    // The lane: the orb's centre this far up from the bottom of the screen, under the content.
    const laneShare = phone ? 0.125 : Math.min(0.17, Math.max(0.11, 130 / height));
    const radiusPx = phone ? 38 : Math.min(66, laneShare * height * 0.5);
    orbR = (radiusPx / (height / 2)) * halfH;
    camH = -(-1 + laneShare * 2) * halfH;
    floorY = -2.8;
    // How far the route swings: the orb crosses from one side of the screen to the other.
    amplitude = Math.max(1.4, ((phone ? 0.42 : 0.4) * halfH * camera.aspect) / (1 - FOLLOW));
    orb.scale.setScalar(orbR);
    buildFloor();
    buildMotes();
    buildRoute();
    measure();
    buildBeads();
    buildBubbles();
    const bh = 2 * 150 * TAN;
    backdrop.scale.set(bh * camera.aspect * 1.2, bh * 1.2, 1);
  };

  // ----- Colours -----

  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const inkColour = new Color();
  const refreshColours = () => {
    const palette = options.palette();
    const canvasColour = toColour(palette.canvas, probe);
    dark = luminance(canvasColour) < 0.3;
    backdropMaterial.color.copy(canvasColour);
    floorUniforms.uCanvas.value.copy(canvasColour);
    toColour(palette.floor, probe, floorUniforms.uColour.value);
    floorUniforms.uOpacity.value = dark ? 0.72 : 0.4;
    TONE_NAMES.forEach((name, i) => {
      const tone = tones[i];
      if (tone) toColour(palette.tones[name], probe, tone);
    });
    toColour(palette.ink, probe, inkColour);
    moteUniforms.uOpacity.value = dark ? 0.55 : 0.4;
    moteMaterial.blending = dark ? AdditiveBlending : NormalBlending;
    moteMaterial.needsUpdate = true;
    for (const m of [orbGlass, beadGlass, bubbleGlass]) {
      // Midnight: a little diffuse share so the tinted body shows. Mint: nearly clear.
      m.transmission = dark ? 0.88 : 0.94;
      m.envMapIntensity = dark ? 1.05 : 0.75;
      m.roughness = dark ? 0.05 : 0.04;
    }
    orbGlass.thickness = dark ? 0.9 : 0.8;
    orbGlass.attenuationDistance = dark ? 0.8 : 1.6;
    beadGlass.transmission = dark ? 0.55 : 0.85;
    beadGlass.attenuationColor.copy(white);
    bubbleGlass.attenuationColor.copy(white).lerp(toColour(palette.primary, probe), 0.25);
    orbRim.strength.value = dark ? 1.2 : 0.8;
    orbRim.glow.value = dark ? 0.06 : 0;
    beadRim.strength.value = dark ? 0.9 : 0.6;
    beadRim.glow.value = dark ? 0.14 : 0.04;
    bubbleRim.strength.value = dark ? 1.0 : 0.7;
    bubbleRim.glow.value = dark ? 0.05 : 0;
    shadowMaterial.blending = dark ? AdditiveBlending : NormalBlending;
    shadowMaterial.needsUpdate = true;
    key.intensity = dark ? 1.3 : 1.8;
    paintBubbles();
  };

  refreshColours();
  layout();
  await nextTask();

  // ----- Step 4: compile the glass where the browser can, then add it -----

  await renderer.compileAsync(glassGroup, camera, scene).catch(() => undefined);
  if (!disposed) scene.add(glassGroup);
  await nextTask();

  // ----- The frame -----

  let s = -2;
  let t = 0;
  const head = new Vector3();
  const tangent = new Vector3();
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const scaleV = new Vector3();
  const pos = new Vector3();
  const beadTint = new Color();
  const orbTone = new Color();
  const orbTarget = new Color();
  let toneReady = false;
  let rollX = 0;
  let rollZ = 0;
  let lastAlong = -1;
  let lean = 0;
  let firstFrame = true;

  /** One frame. `snap` puts everything on its goal at once: used while ambient motion is paused. */
  const draw = (dt: number, snap = false) => {
    const curve = route;
    if (anchors.length < 2 || !curve) return;
    const target = progressFromScroll(window.scrollY, anchors);
    // Follows scroll softly, at the calm pace; never stops while scroll moves.
    s = s < -1.5 || snap ? target : s + (target - s) * (1 - Math.exp((-dt * 3.6) / PACE));
    moteUniforms.uTime.value = t;

    // The orb rolls along the route.
    const along = Math.max(0, Math.min(routeLength, piecewise(s, waypointS, routeAt)));
    const u = clamp01(along / routeLength);
    curve.getPointAt(u, head);
    curve.getTangentAt(u, tangent);
    const bob = Math.sin(t * 0.9) * orbR * 0.05;
    orb.position.set(head.x, floorY + orbR + bob, head.z);
    if (lastAlong >= 0 && Math.abs(along - lastAlong) < 3) {
      const step = (along - lastAlong) / orbR;
      rollX += tangent.z * step;
      rollZ -= tangent.x * step;
    }
    lastAlong = along;
    orb.rotation.set(rollX, t * 0.06, rollZ);
    shadow.position.set(head.x, floorY + 0.01, head.z);
    shadow.scale.setScalar(orbR * (2.7 - bob * 2));
    floorUniforms.uHead.value.copy(head);

    // The camera rides behind and above, following part of the swing, leaning into the turns.
    lean = snap ? tangent.x : lean + (tangent.x - lean) * (1 - Math.exp(-dt * 2.5));
    camera.position.set(head.x * FOLLOW, floorY + orbR + camH, head.z + DIST);
    camera.rotation.set(0, -lean * 0.05, -lean * 0.025);

    // Colour: the stop's own, its accent through the rest, then the next stop's.
    colourAt(s, orbTarget);
    if (!toneReady || snap) {
      orbTone.copy(orbTarget);
      toneReady = true;
    }
    orbTone.lerpHSL(orbTarget, 1 - Math.exp((-dt * 2.2) / PACE));
    orbGlass.attenuationColor.copy(white).lerp(orbTone, dark ? 0.85 : 0.7);
    orbGlass.color.copy(white).lerp(orbTone, dark ? 0.9 : 0.75);
    orbGlass.emissive.copy(orbTone);
    orbGlass.emissiveIntensity = dark ? 0.08 : 0;
    orbRim.colour.copy(orbTone);
    floorUniforms.uLitColour.value.copy(orbTone);
    shadowMaterial.color.copy(dark ? orbTone : inkColour);
    shadowMaterial.opacity = dark ? 0.2 : 0.22;

    // Two rims light the orb from behind and beside, in its colour and the stop's other colour.
    const k = Math.max(0, Math.min(stopCount - 1, Math.floor(s)));
    const [own, accent] = stopTone(k);
    rimA.position.set(head.x - 1.5, floorY + orbR + 1.3, head.z - 1.6);
    rimB.position.set(head.x + 1.7, floorY + orbR + 0.7, head.z - 1.2);
    rimA.color.copy(orbTone);
    rimB.color.copy(toneOf(s - k < (restShares[k] ?? 0.5) ? accent : own));
    rimA.intensity = dark ? 12 : 9;
    rimB.intensity = dark ? 9 : 6;

    // Each stop's light swells as the orb rolls past its waypoint (the middle of the rest).
    stopLights.forEach((light, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const ws = waypointS[i + 1] ?? i;
      light.position.set(side * amplitude * 0.7, floorY + 2.6, -(i + 0.3) * GAP + 2);
      light.color.copy(toneOf(stopTone(i)[0]));
      light.intensity = (1 - smooth(Math.abs(s - ws) / 0.9)) * (dark ? 22 : 28);
    });

    // Beads: small ahead, full size behind; those just passed glow in the orb's colour.
    beads.forEach((bead, index) => {
      const g = smooth((along - bead.d + 2.4) / 2.4);
      const r = BEAD_R * (0.45 + 0.55 * g) * (phone ? 0.85 : 1);
      pos.copy(bead.p);
      pos.y = floorY + r;
      scaleV.setScalar(r);
      matrix.compose(pos, quaternion, scaleV);
      beadSet.setMatrixAt(index, matrix);
      colourAt(piecewise(bead.d, routeAt, waypointS), beadTint);
      const behind = along - bead.d;
      const trail = behind >= 0 ? Math.exp(-behind / 2.2) : 0;
      beadTint.lerp(white, dark ? 0 : 0.08).multiplyScalar(1 + trail * (dark ? 1.1 : 1.2));
      beadSet.setColorAt(index, beadTint);
    });
    beadSet.instanceMatrix.needsUpdate = true;
    if (beadSet.instanceColor) beadSet.instanceColor.needsUpdate = true;

    // Bubbles: a stop's cluster rises as the reader nears it, drifts, and sinks before the camera.
    bubbles.forEach((bubble, index) => {
      const clearance = smooth((camera.position.z - bubble.p.z - 4) / 5);
      const grow = smooth((s - bubble.stop + 0.4) / 0.6) * clearance;
      const lift = Math.sin(t * 0.45 + bubble.seed) * 0.14 - (1 - grow) * 0.9;
      pos.copy(bubble.p);
      pos.y += lift;
      scaleV.setScalar(Math.max(1e-4, bubble.r * grow));
      matrix.compose(pos, quaternion, scaleV);
      bubbleSet.setMatrixAt(index, matrix);
    });
    bubbleSet.instanceMatrix.needsUpdate = true;

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
    t += dt;
    const verdict = frameCheck.tick(now);
    if (verdict?.kind === "downgrade") {
      renderer.setPixelRatio(1);
      floorUniforms.uPixelRatio.value = 1;
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

  const resizeObserver = new ResizeObserver(() => {
    layout();
    if (!running) draw(0, true);
    schedule();
  });
  resizeObserver.observe(container);
  // The stops' layout changes (pinned on or off, a band above loading): measure again.
  const journeyObserver = new ResizeObserver(() => measure());
  journeyObserver.observe(journey);

  const intersection = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    if (onScreen) schedule();
    else stop();
  });
  intersection.observe(journey);
  const onVisibility = () => (document.hidden ? stop() : schedule());
  document.addEventListener("visibilitychange", onVisibility);
  // Paused, nothing moves on its own, but the orb keeps its place on the route as the visitor
  // scrolls: one still frame per scroll, never a loop (MK14).
  let pausedFrame = 0;
  const onScroll = () => {
    if (running || !onScreen || pausedFrame || disposed) return;
    pausedFrame = requestAnimationFrame(() => {
      pausedFrame = 0;
      draw(0, true);
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  const onLost = (event: Event) => {
    event.preventDefault();
    options.onLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  // A first frame even when ambient motion starts paused, so the scene is drawn in place.
  draw(0, true);

  return {
    setRunning(next) {
      running = next;
      if (running) schedule();
      else stop();
    },
    refreshColours() {
      refreshColours();
      if (!raf) draw(0, true);
    },
    dispose() {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      journeyObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      if (pausedFrame) cancelAnimationFrame(pausedFrame);
      canvas.removeEventListener("webglcontextlost", onLost);
      scene.add(glassGroup);
      scene.traverse((object) => {
        const mesh = object as { geometry?: { dispose: () => void }; material?: unknown };
        mesh.geometry?.dispose();
        (mesh.material as { dispose?: () => void } | undefined)?.dispose?.();
      });
      shadowTexture.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
