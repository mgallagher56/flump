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
import { createStage, isDark, softDot, tokenColour } from "../shared/threeKit";
import type { SceneHandle } from "../shared/useLazyScene";
import { ORB_TONE_TOKEN, type OrbToneName, STOP_ORB_TONES, type StopKey } from "./journeyTypes";

/*
 * Prototype 11's journey: the travelling layer only. The stops are real DOM in front (shared with
 * 11b); this layer sits sticky behind them and keeps moving with scroll, including during each
 * stop's rest, when both information components hold completely still.
 *
 * Prototype 9's world, brought back: a winding bead line on a lit floor lattice that is the route
 * itself, curving from side to side into the distance, so the reader always sees the road ahead.
 * A large glass orb rolls along it with scroll; the camera follows a little behind and above,
 * leaning into each turn. Beside every stop a cluster of glass bubbles rises in the stop's two
 * colours, and a point light in the stop's colour warms the glass as the orb passes.
 *
 * Colour: both bubble sets everywhere. Each stop has its own colour and an accent from the other
 * set (sky or teal with violet or rose). The orb turns from one to the other during the rest and
 * reaches the next stop in its colour; the beads keep the colour the orb had where they lie, so
 * the line is a record of the whole journey, and the beads it has just passed glow for a moment.
 *
 * The rests: the waypoint of each stop sits in the middle of its rest, so while both sides hold
 * still the orb rolls through the turn below them, catches the stop's light and changes colour.
 *
 * Glass on Midnight: neither p9's pearl (sheen, iridescence and a white glow made it milky) nor
 * clear glass over a near-black canvas (which reads as black marbles). Coloured glass: a tinted
 * body with a little diffuse share, a coloured Fresnel rim and a faint glow in its own colour.
 * Refraction only sees opaque things, so the backdrop is an opaque plane in the canvas colour and
 * the floor points are premixed with it.
 */

const FOV = 35;
const TAN = Math.tan((FOV * Math.PI) / 360);
/** World depth between stops. */
const GAP = 15;
/** How far behind the orb the camera rides. */
const DIST = 11;
/** How much of the orb's sideways travel the camera follows (the rest shows as the orb's swing). */
const FOLLOW = 0.6;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const c = clamp01(v);
  return c * c * (3 - 2 * c);
};

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

/** Slow rising motes in all four orb colours. */
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

/**
 * A coloured Fresnel rim and a faint body glow, added to the glass's light: tinted at the edge,
 * the way coloured glass reads against a dark room. Instanced glass takes each instance's colour
 * (so a brighter instance colour glows more); the orb takes `colour`.
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

  const sections = Array.from(journey.querySelectorAll<HTMLElement>("[data-journey-stop]"));
  const stopCount = Math.max(1, sections.length);
  const stopKeys = sections.map((s) => (s.dataset.stopKey ?? "accounts") as StopKey);

  // ----- Colours: the four orb tones, and each stop's own colour and accent -----

  const TONE_NAMES: OrbToneName[] = ["sky", "violet", "teal", "rose"];
  const tones = TONE_NAMES.map(() => new Color());
  const toneIndex = (name: OrbToneName) => TONE_NAMES.indexOf(name);
  const stopTone = (k: number) => {
    const key = stopKeys[Math.max(0, Math.min(stopCount - 1, k))] ?? "accounts";
    return STOP_ORB_TONES[key] ?? (["sky", "violet"] as const);
  };
  const white = new Color(1, 1, 1);

  // ----- Backdrop: opaque, the page's canvas colour, so the glass has something to refract -----

  const backdropMaterial = new MeshBasicMaterial({ toneMapped: false, depthWrite: false });
  const backdrop = new Mesh(new PlaneGeometry(1, 1), backdropMaterial);
  backdrop.position.z = -150;
  backdrop.renderOrder = -10;
  camera.add(backdrop);

  // ----- Light: a white key from above left, two coloured rims that travel with the orb, and one
  // light per stop in its colour, which the orb passes during the rest -----

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

  // ----- Glass -----

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

  /*
   * The glass waits outside the scene until its shaders are compiled off the main thread
   * (compileAsync), so the first frame does not stall on three physical glass programs.
   */
  const glassGroup = new Group();
  const orb = new Mesh(new SphereGeometry(1, 64, 44), orbGlass);
  glassGroup.add(orb);
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

  // ----- Screen-dependent geometry: floor height, orb size, the route's swing -----

  let floorY = -2.8;
  let orbR = 0.6;
  let camH = 2.6;
  let amplitude = 4;
  let phone = false;
  const zNear = GAP * 2;
  const zFar = -(stopCount + 2) * GAP;

  // Floor lattice (rebuilt when the floor height changes).
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

  // Motes: slow rising points in the four colours, for depth.
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
  /** Journey progress `s` of each waypoint: a stop's waypoint is the middle of its rest. */
  let waypointS: number[] = [];
  const START_S = -1.4;
  const endS = stopCount - 1 + 1.8;

  const buildRoute = () => {
    const pts = [new Vector3(0, floorY, -START_S * GAP)];
    for (let k = 0; k < stopCount; k += 1) {
      const side = k % 2 === 0 ? -1 : 1;
      pts.push(new Vector3(side * amplitude, floorY, -(k + 0.3) * GAP));
    }
    pts.push(new Vector3(0, floorY, -endS * GAP));
    route = new CatmullRomCurve3(pts, false, "centripetal");
    routeLength = route.getLength();
    routeAt = pts.map((pt) => {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i <= 800; i += 1) {
        const d = route?.getPointAt(i / 800).distanceToSquared(pt) ?? Infinity;
        if (d < bestD) {
          bestD = d;
          best = (i / 800) * routeLength;
        }
      }
      return best;
    });
  };

  /** Route distance at journey progress `s` (piecewise linear between waypoints). */
  const distanceAt = (s: number) => {
    if (routeAt.length < 2 || waypointS.length !== routeAt.length) return 0;
    if (s <= (waypointS[0] ?? 0)) return 0;
    for (let i = 0; i < waypointS.length - 1; i += 1) {
      const a = waypointS[i] ?? 0;
      const b = waypointS[i + 1] ?? a + 1;
      if (s < b) {
        const from = routeAt[i] ?? 0;
        const to = routeAt[i + 1] ?? from;
        return from + (to - from) * ((s - a) / Math.max(1e-4, b - a));
      }
    }
    return routeLength;
  };

  /** Journey progress at a route distance (the inverse of `distanceAt`). */
  const progressAt = (d: number) => {
    for (let i = 0; i < routeAt.length - 1; i += 1) {
      const a = routeAt[i] ?? 0;
      const b = routeAt[i + 1] ?? a + 1;
      if (d < b) {
        const sa = waypointS[i] ?? 0;
        const sb = waypointS[i + 1] ?? sa + 1;
        return sa + (sb - sa) * ((d - a) / Math.max(1e-4, b - a));
      }
    }
    return waypointS.at(-1) ?? 0;
  };

  /**
   * The orb's colour at journey progress `s`: stop k's colour on arrival, its accent (from the
   * other set) by the end of the rest, then the next stop's colour through the transit. Mixed by
   * hue, so teal to rose passes through blue and violet, never grey.
   */
  /** Each stop's rest, as a share of its scroll to the next stop. */
  let restShares: number[] = [];
  const colourAt = (s: number, out: Color) => {
    const k = Math.floor(s);
    const f = s - k;
    if (k < 0) return out.copy(tones[toneIndex(stopTone(0)[0])] ?? white);
    const [own, accent] = stopTone(k);
    const restShare = restShares[k] ?? 0.5;
    const ownC = tones[toneIndex(own)] ?? white;
    const accentC = tones[toneIndex(accent)] ?? white;
    if (f < restShare)
      return out.copy(ownC).lerpHSL(accentC, smooth((f - 0.1) / (restShare - 0.05)));
    const next = k + 1 < stopCount ? (tones[toneIndex(stopTone(k + 1)[0])] ?? white) : accentC;
    return out.copy(accentC).lerpHSL(next, smooth((f - restShare) / (1 - restShare)));
  };

  // ----- Beads (the route) and bubbles (beside each stop) -----

  const MAX_BEADS = 420;
  const BEAD_STEP = 0.6;
  const BEAD_R = 0.075;
  const sphere = new SphereGeometry(1, 24, 16);
  const beadSet = new InstancedMesh(sphere, beadGlass, MAX_BEADS);
  beadSet.instanceMatrix.setUsage(DynamicDrawUsage);
  beadSet.frustumCulled = false;
  beadSet.count = 0;
  glassGroup.add(beadSet);
  interface Bead {
    p: Vector3;
    d: number;
    colour: Color;
  }
  let beads: Bead[] = [];

  const MAX_BUBBLES = 8 * 8;
  const bubbleSet = new InstancedMesh(sphere, bubbleGlass, MAX_BUBBLES);
  bubbleSet.instanceMatrix.setUsage(DynamicDrawUsage);
  bubbleSet.frustumCulled = false;
  bubbleSet.count = 0;
  glassGroup.add(bubbleSet);
  interface Bubble {
    p: Vector3;
    r: number;
    stop: number;
    seed: number;
    accent: boolean;
  }
  let bubbles: Bubble[] = [];

  const buildBeads = () => {
    beads = [];
    if (!route) return;
    for (let d = 0; d < routeLength && beads.length < MAX_BEADS; d += BEAD_STEP) {
      const p = route.getPointAt(d / routeLength);
      beads.push({ p, d, colour: new Color() });
    }
    beadSet.count = beads.length;
  };

  const buildBubbles = () => {
    bubbles = [];
    const aspect = camera.aspect || 1;
    for (let k = 0; k < stopCount; k += 1) {
      const side = k % 2 === 0 ? -1 : 1;
      const wx = side * amplitude;
      const wz = -(k + 0.3) * GAP;
      // Out at both edges of the screen as the camera passes, behind the stop, never mid-screen.
      // [edge side, share of half width, height above floor, depth behind, radius, accent]
      const set: [number, number, number, number, number, boolean][] = [
        [1, 0.78, 2.1, 3, 0.55, false],
        [1, 1.02, 3.4, 6, 0.4, true],
        [1, 0.66, 4.4, 4.5, 0.24, true],
        [1, 1.08, 1.2, 7.5, 0.7, false],
        [-1, 0.82, 3.0, 4, 0.48, true],
        [-1, 1.05, 1.6, 6.5, 0.62, false],
        [-1, 0.7, 4.2, 5.5, 0.22, false],
        [-1, 0.95, 4.9, 8, 0.32, true],
      ];
      for (const [edge, share, up, back, r, accent] of set) {
        const depth = DIST + back;
        const half = depth * TAN * aspect;
        const centre = wx * FOLLOW;
        bubbles.push({
          p: new Vector3(
            centre + edge * side * half * share * (phone ? 0.9 : 1),
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

  const tint = new Color();
  const paintBubbles = () => {
    bubbles.forEach((b, i) => {
      const [own, accent] = stopTone(b.stop);
      const t = tones[toneIndex(b.accent ? accent : own)] ?? white;
      tint.copy(white).lerp(t, dark ? 1 : 0.88);
      bubbleSet.setColorAt(i, tint);
    });
    if (bubbleSet.instanceColor) bubbleSet.instanceColor.needsUpdate = true;
  };

  // ----- Scroll: progress s, where s = k at the start of stop k's rest -----

  let anchors: number[] = [];
  const measure = () => {
    const vh = window.innerHeight;
    const jr = journey.getBoundingClientRect();
    const journeyTop = jr.top + window.scrollY;
    // s = k where stop k's frame starts to rest (its section top reaches the frame's sticky top).
    const frames = sections.map((section) =>
      section.querySelector<HTMLElement>("[data-stop-frame]"),
    );
    anchors = sections.map((section, i) => {
      const frame = frames[i];
      const stickyTop = frame ? Number.parseFloat(getComputedStyle(frame).top) || 0 : 0;
      return section.getBoundingClientRect().top + window.scrollY - stickyTop;
    });
    const first = anchors[0] ?? journeyTop;
    const second = anchors[1] ?? first + vh;
    const unit = Math.max(1, second - first);
    restShares = sections.map((_section, i) => {
      const next = anchors[i + 1] ?? (anchors[i] ?? first) + unit;
      const span = Math.max(1, next - (anchors[i] ?? first));
      // The frames hold in place: each rest is the span between stops less the changeover beat.
      const frame = frames[i];
      const beat = frame ? -(Number.parseFloat(getComputedStyle(frame).marginTop) || 0) : 0;
      const rest = span - beat;
      return Math.min(0.8, Math.max(0.15, rest / span));
    });
    anchors.unshift(first - unit);
    anchors.push((anchors.at(-1) ?? first) + unit);
    waypointS = [START_S];
    for (let k = 0; k < stopCount; k += 1) waypointS.push(k + (restShares[k] ?? 0.5) * 0.5);
    waypointS.push(endS);
  };

  const progressFromScroll = () => {
    const y = window.scrollY;
    const n = anchors.length - 1;
    if (n < 1) return 0;
    if (y <= (anchors[0] ?? 0)) return -1;
    for (let i = 0; i < n; i += 1) {
      const a = anchors[i] ?? 0;
      const b = anchors[i + 1] ?? a + 1;
      if (y < b) return i - 1 + (y - a) / Math.max(1, b - a);
    }
    return n - 1;
  };

  const layout = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    phone = width < 768;
    const aspect = width / height;
    const halfH = DIST * TAN;
    // The lane: the orb's centre this far up from the bottom of the screen, under the content.
    const laneShare = phone ? 0.125 : Math.min(0.17, Math.max(0.11, 130 / height));
    const radiusPx = phone ? 38 : Math.min(66, laneShare * height * 0.5);
    orbR = (radiusPx / (height / 2)) * halfH;
    const centreNdc = -1 + laneShare * 2;
    // The camera rides above the orb so the orb sits in the lane; the floor is under the orb.
    camH = -centreNdc * halfH;
    floorY = -2.8;
    // How far the route swings: the orb crosses from one side of the screen to the other.
    const swingNdc = phone ? 0.42 : 0.4;
    amplitude = Math.max(1.4, (swingNdc * halfH * aspect) / (1 - FOLLOW));
    orb.scale.setScalar(orbR);
    buildFloor();
    buildMotes();
    buildRoute();
    measure();
    buildBeads();
    buildBubbles();
    const bh = 2 * 150 * TAN;
    backdrop.scale.set(bh * aspect * 1.2, bh * 1.2, 1);
  };

  stage.onResize(() => {
    floorUniforms.uPixelRatio.value = renderer.getPixelRatio();
    layout();
  });
  const journeyObserver = new ResizeObserver(() => measure());
  journeyObserver.observe(journey);

  // ----- Theme colours -----

  let dark = isDark();
  const orbTone = new Color();
  const orbTarget = new Color();
  let toneReady = false;

  const refreshColours = () => {
    dark = isDark();
    const canvas = tokenColour("--colors-surface-canvas");
    backdropMaterial.color.copy(canvas);
    floorUniforms.uCanvas.value.copy(canvas);
    floorUniforms.uColour.value.copy(
      tokenColour(dark ? "--colors-border-strong" : "--colors-text-secondary"),
    );
    floorUniforms.uOpacity.value = dark ? 0.72 : 0.4;
    TONE_NAMES.forEach((name, i) => {
      tones[i]?.copy(tokenColour(ORB_TONE_TOKEN[name]));
    });
    moteUniforms.uOpacity.value = dark ? 0.55 : 0.4;
    moteMaterial.blending = dark ? AdditiveBlending : NormalBlending;
    moteMaterial.needsUpdate = true;
    for (const m of [orbGlass, beadGlass, bubbleGlass]) {
      // Midnight: a little diffuse share so the tinted body shows (not black), no sheen and no
      // white glow (not pearl). Mint: nearly clear, the room's walls kept low so pale glass holds.
      m.transmission = dark ? 0.88 : 0.94;
      m.envMapIntensity = dark ? 1.05 : 0.75;
      m.roughness = dark ? 0.05 : 0.04;
    }
    // Mint's chart colours are deep: a lighter body keeps the orb coloured glass, not grey.
    orbGlass.thickness = dark ? 0.9 : 0.8;
    orbGlass.attenuationDistance = dark ? 0.8 : 1.6;
    // Small beads show mostly their own colour, so the line reads as coloured light on Midnight.
    beadGlass.transmission = dark ? 0.55 : 0.85;
    beadGlass.attenuationColor.copy(white);
    bubbleGlass.attenuationColor.copy(white).lerp(tokenColour("--colors-primary-mark"), 0.25);
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

  let disposed = false;
  const addGlass = () => {
    if (!disposed) scene.add(glassGroup);
  };
  renderer.compileAsync(glassGroup, camera, scene).then(addGlass, addGlass);

  // ----- Frame -----

  let s = -2;
  const head = new Vector3();
  const tangent = new Vector3();
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const scaleV = new Vector3();
  const pos = new Vector3();
  const beadTint = new Color();
  let rollX = 0;
  let rollZ = 0;
  let lastAlong = -1;
  let lean = 0;

  stage.onFrame(({ dt, t }) => {
    if (anchors.length < 2 || !route) return;
    const factor = getPace();
    const target = progressFromScroll();
    // Follows scroll softly; a calmer pace follows more gently. Never stops while scroll moves.
    s = s < -1.5 ? target : s + (target - s) * (1 - Math.exp((-dt * 3.6) / factor));
    moteUniforms.uTime.value = t;

    // ----- The orb rolls along the route -----
    const along = Math.max(0, Math.min(routeLength, distanceAt(s)));
    const u = clamp01(along / routeLength);
    route.getPointAt(u, head);
    route.getTangentAt(u, tangent);
    const bob = Math.sin(t * 0.9) * orbR * 0.05;
    orb.position.set(head.x, floorY + orbR + bob, head.z);
    if (lastAlong >= 0 && Math.abs(along - lastAlong) < 3) {
      // Roll the way it travels, about the axis across its path.
      const step = (along - lastAlong) / orbR;
      rollX += tangent.z * step;
      rollZ -= tangent.x * step;
    }
    lastAlong = along;
    orb.rotation.set(rollX, t * 0.06, rollZ);
    shadow.position.set(head.x, floorY + 0.01, head.z);
    shadow.scale.setScalar(orbR * (2.7 - bob * 2));
    floorUniforms.uHead.value.copy(head);

    // ----- Camera: behind and above, following part of the swing, leaning into the turns -----
    lean += (tangent.x - lean) * (1 - Math.exp(-dt * 2.5));
    camera.position.set(head.x * FOLLOW, floorY + orbR + camH, head.z + DIST);
    camera.rotation.set(0, -lean * 0.05, -lean * 0.025);

    // ----- Colour: the stop's own colour, its accent through the rest, then the next stop -----
    colourAt(s, orbTarget);
    if (!toneReady) {
      orbTone.copy(orbTarget);
      toneReady = true;
    }
    orbTone.lerpHSL(orbTarget, 1 - Math.exp((-dt * 2.2) / factor));
    orbGlass.attenuationColor.copy(white).lerp(orbTone, dark ? 0.85 : 0.7);
    orbGlass.color.copy(white).lerp(orbTone, dark ? 0.9 : 0.75);
    orbGlass.emissive.copy(orbTone);
    orbGlass.emissiveIntensity = dark ? 0.08 : 0;
    orbRim.colour.copy(orbTone);
    floorUniforms.uLitColour.value.copy(orbTone);
    shadowMaterial.color.copy(dark ? orbTone : tokenColour("--colors-text-primary"));
    shadowMaterial.opacity = dark ? 0.2 : 0.22;

    // Two rims light the orb from behind and beside, in its colour and the stop's other colour.
    const k = Math.max(0, Math.min(stopCount - 1, Math.floor(s)));
    const [own, accent] = stopTone(k);
    rimA.position.set(head.x - 1.5, floorY + orbR + 1.3, head.z - 1.6);
    rimB.position.set(head.x + 1.7, floorY + orbR + 0.7, head.z - 1.2);
    rimA.color.copy(orbTone);
    rimB.color.copy(tones[toneIndex(s - k < (restShares[k] ?? 0.5) ? accent : own)] ?? white);
    rimA.intensity = dark ? 12 : 9;
    rimB.intensity = dark ? 9 : 6;

    // Each stop's light swells as the orb rolls past its waypoint (the middle of the rest).
    stopLights.forEach((light, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const ws = waypointS[i + 1] ?? i;
      light.position.set(side * amplitude * 0.7, floorY + 2.6, -(i + 0.3) * GAP + 2);
      light.color.copy(tones[toneIndex(stopTone(i)[0])] ?? white);
      light.intensity = (1 - smooth(Math.abs(s - ws) / 0.9)) * (dark ? 22 : 28);
    });

    // ----- Beads: small ahead, full size behind; those just passed glow in the orb's colour -----
    beads.forEach((bead, index) => {
      const g = smooth((along - bead.d + 2.4) / 2.4);
      const r = BEAD_R * (0.45 + 0.55 * g) * (phone ? 0.85 : 1);
      pos.copy(bead.p);
      pos.y = floorY + r;
      scaleV.setScalar(r);
      matrix.compose(pos, quaternion, scaleV);
      beadSet.setMatrixAt(index, matrix);
      colourAt(progressAt(bead.d), beadTint);
      const behind = along - bead.d;
      const trail = behind >= 0 ? Math.exp(-behind / 2.2) : 0;
      beadTint.lerp(white, dark ? 0 : 0.08).multiplyScalar(1 + trail * (dark ? 1.1 : 1.2));
      beadSet.setColorAt(index, beadTint);
    });
    beadSet.instanceMatrix.needsUpdate = true;
    if (beadSet.instanceColor) beadSet.instanceColor.needsUpdate = true;

    // ----- Bubbles: a stop's cluster rises into being as the reader nears it, then drifts -----
    bubbles.forEach((bubble, index) => {
      // Rises as the reader nears its stop; sinks away before the camera reaches it.
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
  });

  return {
    refreshColours,
    dispose: () => {
      disposed = true;
      scene.add(glassGroup);
      journeyObserver.disconnect();
      shadowTexture.dispose();
      stage.dispose();
    },
  };
}
