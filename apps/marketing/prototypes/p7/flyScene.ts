import {
  AdditiveBlending,
  type Blending,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  Group,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { createStage, isDark, softDot, tokenColour } from "../shared/threeKit";
import type { SceneHandle } from "../shared/useLazyScene";

/*
 * Prototype 7's scene: a camera flying forward through layered space, driven by scroll.
 *
 * Two layers share one camera. The CSS3D layer holds crisp, themable copies of the still sample
 * cards, split at every `data-part` so the parts hang apart in depth and come together as the
 * camera arrives. The WebGL layer holds the depth cues, all generated: a lattice of floor points
 * lit around the current stop, a light path that draws itself along the route, a post under each
 * card and a few motes. No fog: distance fades are per point, never a wash over content.
 *
 * Each stop's camera pose is solved so its 3D card lands exactly where the still card sits in the
 * stop's section, at the same pixel size, so the copy and the card line up when the reader arrives.
 */

const SCALE = 0.01; // world units per CSS pixel
const GAP = 17; // depth between stops
const FLOOR = -3.4;
const FOV = 35;
const TAN = Math.tan((FOV * Math.PI) / 360);

/** Where each card hangs (stop 1 to 6), weaving left and right along the route. */
const CARD_SPOTS: readonly [number, number][] = [
  [0.6, 0.2],
  [-3.2, -0.3],
  [3.0, 0.5],
  [-2.6, 0],
  [3.4, 0.3],
  [0, 0.4],
];

interface Pose {
  x: number;
  y: number;
  z: number;
}

interface Part {
  object: CSS3DObject;
  base: Vector3;
  /** Where the part waits, relative to its place, before it comes together. */
  away: Vector3;
  turn: number;
  /** How far before arrival (in stops) the part is in place. */
  lead: number;
  last: number;
}

interface Stop {
  group: Group;
  frame: CSS3DObject;
  parts: Part[];
  position: Vector3;
  side: number;
  lastOpacity: number;
  pad: Mesh;
}

/** cubic-bezier(0.65, 0, 0.35, 1), the "flumpInOut" curve, solved for x. */
function flumpInOut(x: number): number {
  const [x1, y1, x2, y2] = [0.65, 0, 0.35, 1];
  const bez = (t: number, a: number, b: number) =>
    3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  let lo = 0;
  let hi = 1;
  let t = x;
  for (let i = 0; i < 20; i += 1) {
    t = (lo + hi) / 2;
    if (bez(t, x1, x2) < x) lo = t;
    else hi = t;
  }
  return bez(t, y1, y2);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const c = clamp01(v);
  return c * c * (3 - 2 * c);
};

const FADE_VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform vec3 uHead;
  uniform float uDrift;
  varying float vDepth;
  varying float vLit;
  varying float vSeed;
  void main() {
    vec3 p = position;
    p.y += uDrift * mod(uTime * 0.12 + aSeed * 9.0, 9.0);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    float d = distance(world.xz, uHead.xz);
    vLit = exp(-d * d / 7.0);
    vSeed = aSeed;
    gl_PointSize = uSize * uPixelRatio * (1.0 + vLit * 0.9) / max(vDepth, 0.5) * 10.0;
    gl_Position = projectionMatrix * mv;
  }
`;

const FADE_FRAGMENT = /* glsl */ `
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
    float edge = 1.0 - smoothstep(0.32, 0.5, r);
    float fade = (1.0 - smoothstep(uFar * 0.45, uFar, vDepth)) * smoothstep(0.8, 3.0, vDepth);
    float a = uOpacity * edge * fade * (0.55 + 0.45 * vSeed + vLit * 1.6);
    gl_FragColor = vec4(mix(uColour, uLitColour, clamp(vLit * 1.4, 0.0, 1.0)), clamp(a, 0.0, 1.0));
  }
`;

const LINE_VERTEX = /* glsl */ `
  varying float vDepth;
  varying float vHeight;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    vHeight = uv.y;
    gl_Position = projectionMatrix * mv;
  }
`;

const LINE_FRAGMENT = /* glsl */ `
  uniform vec3 uColour;
  uniform float uOpacity;
  varying float vDepth;
  varying float vHeight;
  void main() {
    float fade = 1.0 - smoothstep(26.0, 60.0, vDepth);
    gl_FragColor = vec4(uColour, uOpacity * fade * (1.0 - vHeight * 0.85));
  }
`;

const TUBE_VERTEX = /* glsl */ `
  varying float vDepth;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const TUBE_FRAGMENT = /* glsl */ `
  uniform vec3 uColour;
  uniform float uOpacity;
  varying float vDepth;
  void main() {
    float fade = smoothstep(7.0, 15.0, vDepth) * (1.0 - smoothstep(30.0, 62.0, vDepth));
    gl_FragColor = vec4(uColour, uOpacity * fade);
  }
`;

const tubeMaterial = (uniforms: { uColour: { value: Color }; uOpacity: { value: number } }) =>
  new ShaderMaterial({
    uniforms,
    vertexShader: TUBE_VERTEX,
    fragmentShader: TUBE_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });

export function createFlyScene({
  container,
  flight,
  onFallback,
}: {
  container: HTMLElement;
  flight: HTMLElement;
  onFallback: (reason: string) => void;
}): SceneHandle {
  const stage = createStage({
    container,
    watch: flight,
    onFallback,
    fov: FOV,
    environment: false,
  });
  const { scene, camera, renderer } = stage;

  const css = new CSS3DRenderer();
  css.domElement.className = "p7-css3d";
  css.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(css.domElement);

  const sections = Array.from(flight.querySelectorAll<HTMLElement>("[data-stop]"));
  const hero = flight.querySelector<HTMLElement>(".p7-hero");

  // ----- Cards: CSS3D copies of the still cards, split into parts -----

  const stops: Stop[] = [];
  const cardRoot = new Group();
  scene.add(cardRoot);

  const padTexture = softDot(128, 255, 1);

  const clear = (el: HTMLElement) => {
    el.removeAttribute("id");
    for (const child of el.querySelectorAll("[id]")) child.removeAttribute("id");
    el.removeAttribute("title");
    for (const child of el.querySelectorAll("[title]")) child.removeAttribute("title");
  };

  const buildCards = () => {
    for (const stop of stops) {
      for (const part of stop.parts) part.object.element.remove();
      stop.frame.element.remove();
      cardRoot.remove(stop.group);
      scene.remove(stop.pad);
      stop.pad.geometry.dispose();
      (stop.pad.material as MeshBasicMaterial).dispose();
    }
    stops.length = 0;
    sections.forEach((section, index) => {
      const still = section.querySelector<HTMLElement>("[data-stop-card]");
      if (!still) return;
      const rect = still.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const [sx = 0, sy = 0] = CARD_SPOTS[index] ?? [0, 0];
      const position = new Vector3(sx, sy, -index * GAP - (index === sections.length - 1 ? 4 : 0));
      const side = sx === 0 ? (index % 2 ? -1 : 1) : Math.sign(sx);

      const group = new Group();
      group.position.copy(position);
      group.scale.setScalar(SCALE);
      cardRoot.add(group);

      const frameEl = still.cloneNode(true) as HTMLElement;
      clear(frameEl);
      frameEl.style.width = `${rect.width}px`;
      frameEl.style.margin = "0";
      for (const p of frameEl.querySelectorAll<HTMLElement>("[data-part]"))
        p.style.visibility = "hidden";
      const frame = new CSS3DObject(frameEl);
      group.add(frame);

      const stillParts = Array.from(still.querySelectorAll<HTMLElement>("[data-part]"));
      const parts: Part[] = stillParts.map((stillPart, j) => {
        const r = stillPart.getBoundingClientRect();
        const el = stillPart.cloneNode(true) as HTMLElement;
        clear(el);
        el.classList.add("p7-part");
        // A little side margin, so a part in flight reads as a tile (tiles have their own).
        const tile = el.classList.contains("p7-dash__tile");
        el.style.width = `${r.width + (tile ? 0 : 16)}px`;
        const object = new CSS3DObject(el);
        const base = new Vector3(r.left + r.width / 2 - cx, -(r.top + r.height / 2 - cy), 2 + j);
        const lane = j - (stillParts.length - 1) / 2;
        // Each part waits nearer the camera, its rows a little apart so none covers another.
        // The head lands first, then each row in reading order, all before the camera arrives.
        const away = new Vector3(0, lane * 22, 150 + j * 45);
        const lead =
          0.06 + ((stillParts.length - 1 - j) / Math.max(1, stillParts.length - 1)) * 0.28;
        group.add(object);
        return { object, base, away, lead, turn: (j % 2 ? 1 : -1) * 0.1, last: -1 };
      });

      const pad = new Mesh(
        new PlaneGeometry(1, 1),
        new MeshBasicMaterial({
          map: padTexture,
          transparent: true,
          depthWrite: false,
          opacity: 0,
        }),
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(position.x, FLOOR + 0.01, position.z);
      pad.scale.setScalar(rect.width * SCALE * 1.6);
      scene.add(pad);

      stops.push({ group, frame, parts, position, side, lastOpacity: -1, pad });
    });
  };

  // ----- Floor: a lattice of points, lit around the current stop -----

  const floorPositions: number[] = [];
  const floorSeeds: number[] = [];
  const zNear = 34;
  const zFar = -(sections.length * GAP + 30);
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
    uTime: { value: 0 },
    uHead: { value: new Vector3() },
    uDrift: { value: 0 },
    uColour: { value: new Color() },
    uLitColour: { value: new Color() },
    uOpacity: { value: 0.5 },
    uFar: { value: 48 },
  };
  const floorMaterial = new ShaderMaterial({
    uniforms: floorUniforms,
    vertexShader: FADE_VERTEX,
    fragmentShader: FADE_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
  scene.add(new Points(floorGeometry, floorMaterial));

  // ----- Motes: sparse points in the air for depth (rising slowly) -----

  const motePositions: number[] = [];
  const moteSeeds: number[] = [];
  for (let i = 0; i < 260; i += 1) {
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
    ...floorUniforms,
    uSize: { value: 1.3 },
    uDrift: { value: 1 },
    uOpacity: { value: 0.35 },
    uFar: { value: 40 },
    uHead: floorUniforms.uHead,
    uTime: floorUniforms.uTime,
    uColour: floorUniforms.uLitColour,
    uLitColour: floorUniforms.uLitColour,
  };
  const moteMaterial = new ShaderMaterial({
    uniforms: moteUniforms,
    vertexShader: FADE_VERTEX,
    fragmentShader: FADE_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
  scene.add(new Points(moteGeometry, moteMaterial));

  // ----- The light path along the route, and a post under each card -----

  let pathCurve: CatmullRomCurve3 | null = null;
  let pathStops: number[] = [];
  const pathSegments = 900;
  const radial = 6;
  const pathUniforms = { uColour: { value: new Color() }, uOpacity: { value: 1 } };
  const routeUniforms = { uColour: { value: new Color() }, uOpacity: { value: 1 } };
  const pathMaterial = tubeMaterial(pathUniforms);
  const routeMaterial = tubeMaterial(routeUniforms);
  let pathMesh: Mesh | null = null;
  let routeMesh: Mesh | null = null;
  const headMaterial = new MeshBasicMaterial({
    map: padTexture,
    transparent: true,
    depthWrite: false,
  });
  const head = new Mesh(new PlaneGeometry(1.6, 1.6), headMaterial);
  head.rotation.x = -Math.PI / 2;
  scene.add(head);

  const postUniforms = { uColour: { value: new Color() }, uOpacity: { value: 0.5 } };
  const postMaterial = new ShaderMaterial({
    uniforms: postUniforms,
    vertexShader: LINE_VERTEX,
    fragmentShader: LINE_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
  let posts: LineSegments | null = null;

  const buildRoute = () => {
    for (const mesh of [pathMesh, routeMesh, posts]) {
      if (!mesh) continue;
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
    const first = stops[0]?.position ?? new Vector3();
    const points = [
      new Vector3(first.x - 1.5, FLOOR + 0.02, first.z + 30),
      ...stops.map((s) => new Vector3(s.position.x, FLOOR + 0.02, s.position.z)),
    ];
    const last = points[points.length - 1] ?? new Vector3();
    points.push(new Vector3(last.x, FLOOR + 0.02, last.z - 10));
    pathCurve = new CatmullRomCurve3(points, false, "centripetal");
    // Arc length fraction at each stop, for drawing the path up to the reader's place.
    const lengths = [0];
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      lengths.push((lengths[i - 1] ?? 0) + (a && b ? a.distanceTo(b) : 0));
    }
    const total = lengths[lengths.length - 1] ?? 1;
    pathStops = lengths.map((l) => l / total);

    pathMesh = new Mesh(new TubeGeometry(pathCurve, pathSegments, 0.028, radial), pathMaterial);
    routeMesh = new Mesh(new TubeGeometry(pathCurve, pathSegments, 0.018, radial), routeMaterial);
    scene.add(routeMesh, pathMesh);

    const postPositions: number[] = [];
    const postUvs: number[] = [];
    for (const [i, s] of stops.entries()) {
      const still = sections[i]?.querySelector<HTMLElement>("[data-stop-card]");
      const half = ((still?.offsetHeight ?? 300) * SCALE) / 2;
      postPositions.push(
        s.position.x,
        FLOOR,
        s.position.z,
        s.position.x,
        s.position.y - half,
        s.position.z,
      );
      postUvs.push(0, 0, 0, 1);
    }
    const postGeometry = new BufferGeometry();
    postGeometry.setAttribute("position", new Float32BufferAttribute(postPositions, 3));
    postGeometry.setAttribute("uv", new Float32BufferAttribute(postUvs, 2));
    posts = new LineSegments(postGeometry, postMaterial);
    scene.add(posts);
  };

  // ----- Scroll anchors and camera poses -----

  let anchors: number[] = [];
  let poses: Pose[] = [];
  let phone = false;

  const measure = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    const header = document.querySelector("header")?.offsetHeight ?? 0;
    const depth = (SCALE * height) / (2 * TAN);
    anchors = [0];
    poses = [];
    sections.forEach((section, i) => {
      const sectionRect = section.getBoundingClientRect();
      anchors.push(sectionRect.top + window.scrollY - header);
      const still = section.querySelector<HTMLElement>("[data-stop-card]");
      const stop = stops[i];
      if (!still || !stop) return;
      const r = still.getBoundingClientRect();
      const nx = ((r.left + r.width / 2) / width) * 2 - 1;
      const ny = 1 - ((r.top - sectionRect.top + header + r.height / 2) / height) * 2;
      poses.push({
        x: stop.position.x - nx * depth * TAN * aspect,
        y: stop.position.y - ny * depth * TAN,
        z: stop.position.z + depth,
      });
    });
    // The hero pose: further back, the first card small and below or beside the copy.
    const first = stops[0]?.position ?? new Vector3();
    const heroDepth = depth + (phone ? 20 : 15);
    const heroNx = phone ? 0.1 : 0.42;
    const heroNy = phone ? -0.5 : -0.18;
    poses.unshift({
      x: first.x - heroNx * heroDepth * TAN * aspect,
      y: first.y - heroNy * heroDepth * TAN + 0.6,
      z: first.z + heroDepth,
    });
    if (hero) anchors[0] = 0;
  };

  const rebuild = () => {
    phone = container.clientWidth < 768;
    buildCards();
    buildRoute();
    measure();
    refreshColours();
  };

  let lastWidthBucket = -1;
  stage.onResize(({ width }) => {
    const bucket = width < 768 ? 0 : 1;
    css.setSize(width, stage.size.height);
    floorUniforms.uPixelRatio.value = renderer.getPixelRatio();
    if (bucket !== lastWidthBucket) {
      lastWidthBucket = bucket;
      rebuild();
    } else {
      measure();
    }
  });
  const flightObserver = new ResizeObserver(() => measure());
  flightObserver.observe(flight);
  document.fonts?.ready.then(() => rebuild());

  // Hide the fixed layer once the fly-through has scrolled away.
  const visibility = new IntersectionObserver(([entry]) => {
    container.style.visibility = entry?.isIntersecting ? "" : "hidden";
  });
  visibility.observe(flight);

  // ----- Colours -----

  const refreshColours = () => {
    const dark = isDark();
    const blending: Blending = dark ? AdditiveBlending : NormalBlending;
    const primary = tokenColour("--colors-primary");
    const mark = tokenColour(dark ? "--colors-primary-mark-lit" : "--colors-primary");
    floorUniforms.uColour.value.copy(
      tokenColour(dark ? "--colors-border" : "--colors-text-secondary"),
    );
    floorUniforms.uLitColour.value.copy(mark);
    floorUniforms.uOpacity.value = dark ? 0.8 : 0.4;
    moteUniforms.uOpacity.value = dark ? 0.4 : 0.22;
    floorMaterial.blending = blending;
    moteMaterial.blending = blending;
    pathUniforms.uColour.value.copy(dark ? mark : primary);
    pathMaterial.blending = blending;
    routeUniforms.uColour.value.copy(tokenColour("--colors-border"));
    routeUniforms.uOpacity.value = dark ? 0.7 : 1;
    pathUniforms.uOpacity.value = dark ? 1 : 0.75;
    headMaterial.color.copy(mark);
    headMaterial.blending = blending;
    headMaterial.opacity = dark ? 0.45 : 0.5;
    postUniforms.uColour.value.copy(dark ? mark : primary);
    postUniforms.uOpacity.value = dark ? 0.55 : 0.45;
    postMaterial.blending = blending;
    for (const stop of stops) {
      const m = stop.pad.material as MeshBasicMaterial;
      m.color.copy(mark);
      m.blending = blending;
    }
    for (const material of [floorMaterial, moteMaterial, pathMaterial, headMaterial, postMaterial])
      material.needsUpdate = true;
  };

  // ----- Frame -----

  let s = -1;
  const lookTarget = new Vector3();

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

  /** Arc length fraction along the route for a scroll progress. */
  const routeAt = (progress: number) => {
    if (pathStops.length < 2) return 0;
    const i = Math.min(Math.floor(progress), pathStops.length - 2);
    const from = pathStops[i] ?? 0;
    const to = pathStops[i + 1] ?? 1;
    return clamp01(from + (to - from) * (progress - i));
  };

  stage.onFrame(({ dt, t }) => {
    if (poses.length < 2) return;
    const target = progressFromScroll();
    s = s < 0 ? target : s + (target - s) * (1 - Math.exp(-dt * 5.5));
    floorUniforms.uTime.value = t;

    // Camera between two poses: mostly the in-out curve, a little linear so it never sits still.
    const n = poses.length - 1;
    const i = Math.min(Math.floor(s), n - 1);
    const f = clamp01(s - i);
    const e = flumpInOut(f) * 0.72 + f * 0.28;
    const a = poses[i];
    const b = poses[i + 1] ?? a;
    if (!a || !b) return;
    const arc = Math.sin(Math.PI * e);
    const dir = Math.sign(b.x - a.x) || 1;
    // Frame the arriving card: its place on screen moves from where it was seen to where it
    // lands, and its distance closes, so it is in view the whole way (on phones too).
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
      // On a phone the panels scroll through the upper half mid-flight, so the arriving card
      // dips into the clear lower half and rises to its place as its section arrives.
      const ny = nyA + (nyB - nyA) * e - (phone && i > 0 ? Math.sin(Math.PI * e) * 0.8 : 0);
      const framed = {
        x: arriving.x - nx * depth * TAN * aspect,
        y: arriving.y - ny * depth * TAN,
        z: arriving.z + depth,
      };
      // Ease out of the stop pose first, so leaving a stop never jumps.
      const w = smooth(e / 0.3);
      camera.position.set(
        a.x + (framed.x - a.x) * w,
        a.y + (framed.y - a.y) * w + arc * 0.35,
        a.z + (framed.z - a.z) * w,
      );
    }
    // A slight roll into the turn mid-flight, square again at every stop so the card lines up.
    camera.rotation.set(0, 0, -dir * arc * 0.03);

    // The light path draws up to the reader's place; the head and floor light follow it.
    const along = routeAt(s);
    pathCurve?.getPointAt(along, lookTarget);
    head.position.set(lookTarget.x, FLOOR + 0.015, lookTarget.z);
    floorUniforms.uHead.value.copy(lookTarget);
    pathMesh?.geometry.setDrawRange(0, Math.floor(along * pathSegments) * radial * 6);

    // Each card: parts wait apart in depth, turned, and come together over the last stretch.
    for (const [index, stop] of stops.entries()) {
      const k = index + 1;
      const d = s - k; // negative while approaching, 0 on arrival
      const apart = smooth(-d / 0.9);
      // Only the next card shows ahead, faintly, except from the hero, where the first one leads.
      const ahead = k === 1 ? 1 : clamp01(1 - (-d - 0.5) * 1.3);
      const passed = 1 - smooth((d - 0.05) / 0.3);
      // Never let a card pass close by the camera: it fades before it could fill the screen.
      const clearance = smooth((camera.position.z - stop.position.z - 5) / 4);
      const opacity = Math.min(ahead, passed) * clearance;
      const visible = opacity > 0.01 && stop.position.z < camera.position.z - 1.2;
      stop.group.visible = visible;
      if (!visible) {
        (stop.pad.material as MeshBasicMaterial).opacity = 0;
        continue;
      }
      stop.group.rotation.y = -stop.side * apart * 0.22;
      stop.frame.position.set(0, 0, -apart * 60);
      const frameOpacity = Math.round(opacity * (1 - apart * 0.35) * 50) / 50;
      if (frameOpacity !== stop.lastOpacity) {
        stop.lastOpacity = frameOpacity;
        stop.frame.element.style.opacity = String(frameOpacity);
      }
      for (const part of stop.parts) {
        // A part shows only once it is nearly in place, so no figure is ever seen cut off.
        const partApart = smooth((-d - part.lead) / 0.6);
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
      const near = 1 - smooth(Math.abs(d) / 0.8);
      (stop.pad.material as MeshBasicMaterial).opacity = near * (isDarkCache ? 0.22 : 0.2);
    }

    css.render(scene, camera);
  });

  let isDarkCache = isDark();
  const refresh = () => {
    isDarkCache = isDark();
    refreshColours();
  };
  refresh();

  return {
    refreshColours: refresh,
    dispose: () => {
      flightObserver.disconnect();
      visibility.disconnect();
      container.style.visibility = "";
      css.domElement.remove();
      padTexture.dispose();
      stage.dispose();
    },
  };
}
