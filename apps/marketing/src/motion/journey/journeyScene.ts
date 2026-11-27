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
  beadLook,
  bubbleRise,
  followLean,
  followProgress,
  frameAction,
  frameDelta,
  isDarkCanvas,
  orbToneAt,
  rimRole,
  rollStep,
  routeAlong,
  routeShare,
  type SceneLook,
  sceneLook,
  shouldLoop,
  stopIndexAt,
  stopLightIntensity,
  stopTonesAt,
  toneShare,
} from "./journeyFrame";
import {
  beadDistances,
  bubbleField,
  cssPixels,
  DIST,
  FLOOR_Y,
  FOLLOW,
  FOV,
  farZ,
  floorLattice,
  journeyAnchors,
  journeyEnd,
  laneFor,
  moteField,
  NEAR_Z,
  nearestAlong,
  routeWaypoints,
  START_S,
  stopDepth,
  stopSide,
  TAN,
} from "./journeyLayout";
import { piecewise, progressFromScroll, waypointProgress } from "./journeyRoute";
import { mulberry32, SCENE_SEEDS } from "./seededRandom";

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
  const stopTone = (k: number) => stopTonesAt(options.stopTones, k, stopCount);
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

  const floorY = FLOOR_Y;
  let orbR = 0.6;
  let camH = 2.6;
  let amplitude = 4;
  let phone = false;
  const zNear = NEAR_Z;
  const zFar = farZ(stopCount);
  const endS = journeyEnd(stopCount);

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
    const { positions, seeds } = floorLattice(zNear, zFar, floorY, mulberry32(SCENE_SEEDS.floor));
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
    const { positions, seeds, toneIds } = moteField(
      200,
      floorY,
      zNear,
      zFar,
      mulberry32(SCENE_SEEDS.motes),
    );
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
    const pts = routeWaypoints(stopCount, amplitude, floorY).map(
      ([x, y, z]) => new Vector3(x, y, z),
    );
    const curve = new CatmullRomCurve3(pts, false, "centripetal");
    route = curve;
    routeLength = curve.getLength();
    const sample = new Vector3();
    routeAt = pts.map((pt) =>
      nearestAlong((u) => curve.getPointAt(u, sample).distanceToSquared(pt), routeLength),
    );
  };

  const colourAt = (s: number, out: Color) => {
    const { from, to, t } = orbToneAt(s, restShares, options.stopTones, stopCount);
    return out.copy(toneOf(from)).lerpHSL(toneOf(to), t);
  };

  const MAX_BEADS = 420;
  const BEAD_STEP = 0.6;
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
    beads = beadDistances(routeLength, BEAD_STEP, MAX_BEADS).map((d) => ({
      p: curve.getPointAt(d / routeLength),
      d,
    }));
    beadSet.count = beads.length;
  };

  let dark = false;
  let look: SceneLook = sceneLook(dark);
  const tint = new Color();
  const paintBubbles = () => {
    bubbles.forEach((b, i) => {
      const [own, accent] = stopTone(b.stop);
      tint.copy(white).lerp(toneOf(b.accent ? accent : own), look.bubbleTint);
      bubbleSet.setColorAt(i, tint);
    });
    if (bubbleSet.instanceColor) bubbleSet.instanceColor.needsUpdate = true;
  };

  const buildBubbles = () => {
    const lane = { amplitude, aspect: camera.aspect || 1, phone };
    bubbles = bubbleField(stopCount, lane, floorY, mulberry32(SCENE_SEEDS.bubbles)).map((spot) => ({
      ...spot,
      p: new Vector3(...spot.p),
    }));
    bubbleSet.count = bubbles.length;
    paintBubbles();
  };

  // ----- Scroll: each stop's anchor is where its frame starts to hold -----

  let anchors: number[] = [];
  const measure = () => {
    const stops = sections.map((section) => {
      const frame = section.querySelector<HTMLElement>("[data-stop-frame]");
      const style = frame ? getComputedStyle(frame) : null;
      return {
        top: section.getBoundingClientRect().top + window.scrollY,
        stickyTop: cssPixels(style?.top),
        beat: -cssPixels(style?.marginTop),
      };
    });
    const journeyTop = journey.getBoundingClientRect().top + window.scrollY;
    const measured = journeyAnchors(stops, journeyTop, window.innerHeight);
    anchors = measured.anchors;
    restShares = measured.restShares;
    waypointS = waypointProgress(restShares, START_S, endS);
  };

  const layout = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const lane = laneFor(width, height);
    if (!lane) return;
    renderer.setSize(width, height, false);
    camera.aspect = lane.aspect;
    camera.updateProjectionMatrix();
    ({ phone, orbR, camH, amplitude } = lane);
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
    dark = isDarkCanvas(canvasColour.r, canvasColour.g, canvasColour.b);
    look = sceneLook(dark);
    backdropMaterial.color.copy(canvasColour);
    floorUniforms.uCanvas.value.copy(canvasColour);
    toColour(palette.floor, probe, floorUniforms.uColour.value);
    floorUniforms.uOpacity.value = look.floorOpacity;
    TONE_NAMES.forEach((name, i) => {
      const tone = tones[i];
      if (tone) toColour(palette.tones[name], probe, tone);
    });
    toColour(palette.ink, probe, inkColour);
    const blending = look.additive ? AdditiveBlending : NormalBlending;
    moteUniforms.uOpacity.value = look.moteOpacity;
    moteMaterial.blending = blending;
    moteMaterial.needsUpdate = true;
    for (const m of [orbGlass, beadGlass, bubbleGlass]) {
      m.transmission = look.glassTransmission;
      m.envMapIntensity = look.glassEnvIntensity;
      m.roughness = look.glassRoughness;
    }
    orbGlass.thickness = look.orbThickness;
    orbGlass.attenuationDistance = look.orbAttenuationDistance;
    beadGlass.transmission = look.beadTransmission;
    beadGlass.attenuationColor.copy(white);
    bubbleGlass.attenuationColor.copy(white).lerp(toColour(palette.primary, probe), 0.25);
    orbRim.strength.value = look.orbRim;
    orbRim.glow.value = look.orbGlow;
    beadRim.strength.value = look.beadRim;
    beadRim.glow.value = look.beadGlow;
    bubbleRim.strength.value = look.bubbleRim;
    bubbleRim.glow.value = look.bubbleGlow;
    shadowMaterial.blending = blending;
    shadowMaterial.needsUpdate = true;
    key.intensity = look.keyLight;
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
    s = followProgress(s, target, dt, snap);
    moteUniforms.uTime.value = t;

    // The orb rolls along the route.
    const along = routeAlong(s, waypointS, routeAt, routeLength);
    const u = routeShare(along, routeLength);
    curve.getPointAt(u, head);
    curve.getTangentAt(u, tangent);
    const bob = Math.sin(t * 0.9) * orbR * 0.05;
    orb.position.set(head.x, floorY + orbR + bob, head.z);
    const roll = rollStep(along, lastAlong, orbR);
    rollX += tangent.z * roll;
    rollZ -= tangent.x * roll;
    lastAlong = along;
    orb.rotation.set(rollX, t * 0.06, rollZ);
    shadow.position.set(head.x, floorY + 0.01, head.z);
    shadow.scale.setScalar(orbR * (2.7 - bob * 2));
    floorUniforms.uHead.value.copy(head);

    // The camera rides behind and above, following part of the swing, leaning into the turns.
    lean = followLean(lean, tangent.x, dt, snap);
    camera.position.set(head.x * FOLLOW, floorY + orbR + camH, head.z + DIST);
    camera.rotation.set(0, -lean * 0.05, -lean * 0.025);

    // Colour: the stop's own, its accent through the rest, then the next stop's.
    colourAt(s, orbTarget);
    if (!toneReady || snap) {
      orbTone.copy(orbTarget);
      toneReady = true;
    }
    orbTone.lerpHSL(orbTarget, toneShare(dt));
    orbGlass.attenuationColor.copy(white).lerp(orbTone, look.orbAttenuationTint);
    orbGlass.color.copy(white).lerp(orbTone, look.orbColourTint);
    orbGlass.emissive.copy(orbTone);
    orbGlass.emissiveIntensity = look.orbEmissive;
    orbRim.colour.copy(orbTone);
    floorUniforms.uLitColour.value.copy(orbTone);
    shadowMaterial.color.copy(look.shadowInOrbTone ? orbTone : inkColour);
    shadowMaterial.opacity = look.shadowOpacity;

    // Two rims light the orb from behind and beside, in its colour and the stop's other colour.
    const k = stopIndexAt(s, stopCount);
    rimA.position.set(head.x - 1.5, floorY + orbR + 1.3, head.z - 1.6);
    rimB.position.set(head.x + 1.7, floorY + orbR + 0.7, head.z - 1.2);
    rimA.color.copy(orbTone);
    rimB.color.copy(toneOf(stopTone(k)[rimRole(s, k, restShares)]));
    rimA.intensity = look.rimA;
    rimB.intensity = look.rimB;

    // Each stop's light swells as the orb rolls past its waypoint (the middle of the rest).
    stopLights.forEach((light, i) => {
      light.position.set(stopSide(i) * amplitude * 0.7, floorY + 2.6, stopDepth(i) + 2);
      light.color.copy(toneOf(stopTone(i)[0]));
      light.intensity = stopLightIntensity(s, waypointS[i + 1] ?? i, dark);
    });

    // Beads: small ahead, full size behind; those just passed glow in the orb's colour.
    beads.forEach((bead, index) => {
      const { radius, glow, whiten } = beadLook(along, bead.d, phone, dark);
      pos.copy(bead.p);
      pos.y = floorY + radius;
      scaleV.setScalar(radius);
      matrix.compose(pos, quaternion, scaleV);
      beadSet.setMatrixAt(index, matrix);
      colourAt(piecewise(bead.d, routeAt, waypointS), beadTint);
      beadTint.lerp(white, whiten).multiplyScalar(glow);
      beadSet.setColorAt(index, beadTint);
    });
    beadSet.instanceMatrix.needsUpdate = true;
    if (beadSet.instanceColor) beadSet.instanceColor.needsUpdate = true;

    // Bubbles: a stop's cluster rises as the reader nears it, drifts, and sinks before the camera.
    bubbles.forEach((bubble, index) => {
      const { lift, scale } = bubbleRise(
        { z: bubble.p.z, stop: bubble.stop, seed: bubble.seed, r: bubble.r },
        camera.position.z,
        s,
        t,
      );
      pos.copy(bubble.p);
      pos.y += lift;
      scaleV.setScalar(scale);
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
    const dt = frameDelta(now, last);
    last = now;
    t += dt;
    const verdict = frameCheck.tick(now);
    const action = frameAction(verdict);
    if (action === "downgrade") {
      renderer.setPixelRatio(1);
      floorUniforms.uPixelRatio.value = 1;
      layout();
    } else if (action === "report" && verdict) {
      options.onVerdict(verdict);
    }
    draw(dt);
    schedule();
  };
  function schedule() {
    if (raf || disposed) return;
    if (!shouldLoop({ onScreen, running, hidden: document.hidden })) {
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
