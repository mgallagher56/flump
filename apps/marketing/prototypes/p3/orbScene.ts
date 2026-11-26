import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export interface OrbScene {
  refreshColours: () => void;
  dispose: () => void;
}

interface Options {
  /** The sticky stage the canvas fills. */
  container: HTMLElement;
  /** The hero section: scroll progress through it parts the fog. */
  hero: HTMLElement;
  /** Called when the scene gives up (too slow, or the context is lost) and the still should show. */
  onFallback: (reason: string) => void;
}

const MAX_PIXEL_RATIO = 1.5;
const FOG_COUNT = 16;

/** Resolves a token variable (whatever colour syntax it computes to) to sRGB through a 1px canvas. */
function tokenColour(name: string): Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx || !value) return new Color();
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
}

interface Blob {
  x: number;
  y: number;
  r: number;
  a: number;
}

/**
 * An alpha mask built pixel by pixel from soft round blobs. The colour channels are one flat
 * value (white for fog, which the material tints with the canvas token; black for the shadow).
 */
function maskTexture(size: number, blobs: Blob[], channel: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const image = ctx.createImageData(size, size);
    for (let py = 0; py < size; py += 1) {
      for (let px = 0; px < size; px += 1) {
        let alpha = 0;
        for (const blob of blobs) {
          const d = Math.hypot(px - blob.x, py - blob.y) / blob.r;
          if (d < 1) alpha += blob.a * (1 - d) * (1 - d);
        }
        const i = (py * size + px) * 4;
        image.data[i] = channel;
        image.data[i + 1] = channel;
        image.data[i + 2] = channel;
        image.data[i + 3] = Math.min(255, alpha * 255);
      }
    }
    ctx.putImageData(image, 0, 0);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A soft cloud: overlapping blobs, seeded so each texture differs. */
function cloudTexture(seed: number): CanvasTexture {
  const size = 128;
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const blobs: Blob[] = [];
  for (let i = 0; i < 14; i += 1) {
    blobs.push({
      x: size * (0.25 + rand() * 0.5),
      y: size * (0.32 + rand() * 0.36),
      r: size * (0.14 + rand() * 0.2),
      a: 0.35,
    });
  }
  return maskTexture(size, blobs, 255);
}

/** A soft round shadow for under the orb. */
function shadowTexture(): CanvasTexture {
  return maskTexture(64, [{ x: 32, y: 32, r: 32, a: 0.5 }], 0);
}

/** The logo's shape: a sphere a little wider than tall, its base slightly flattened. */
function orbGeometry(): SphereGeometry {
  const geometry = new SphereGeometry(1, 96, 64);
  const position = geometry.getAttribute("position");
  const v = new Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const y = v.y < 0 ? v.y * 0.86 : v.y * 0.96;
    position.setXYZ(i, v.x * 1.04, y, v.z * 1.04);
  }
  geometry.computeVertexNormals();
  return geometry;
}

interface FogPuff {
  sprite: Sprite;
  home: Vector3;
  side: number;
  depth: number;
  baseOpacity: number;
  phase: number;
}

const dark = () =>
  document.documentElement.classList.contains("dark") ||
  document.documentElement.dataset.theme === "dark";

export function createOrbScene({ container, hero, onFallback }: Options): OrbScene {
  const renderer = new WebGLRenderer({
    antialias: window.devicePixelRatio < 2,
    alpha: true,
    powerPreference: "high-performance",
  });
  let pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.domElement.className = "p3-canvas";
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.2, 8);

  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;

  const hemi = new HemisphereLight(new Color(1, 1, 1), new Color(0.2, 0.25, 0.25), 0.6);
  const key = new DirectionalLight(new Color(1, 1, 1), 2.2);
  key.position.set(-3, 4, 5);
  const rim = new DirectionalLight(new Color(1, 1, 1), 1.4);
  rim.position.set(3, 1, -4);
  scene.add(hemi, key, rim);

  const orbGroup = new Group();
  scene.add(orbGroup);
  // A glossy coat over a softer body, like the logo: soft highlights, not a mirror.
  const orbMaterial = new MeshPhysicalMaterial({
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.22,
  });
  const orb = new Mesh(orbGeometry(), orbMaterial);
  orbGroup.add(orb);

  const shadowMaterial = new MeshBasicMaterial({
    map: shadowTexture(),
    transparent: true,
    depthWrite: false,
  });
  const shadow = new Mesh(new PlaneGeometry(2.6, 2.6), shadowMaterial);
  shadow.position.set(0, -1.12, -0.3);
  shadow.scale.set(1, 0.3, 1);
  orbGroup.add(shadow);

  const textures = [cloudTexture(7), cloudTexture(42), cloudTexture(1337)];
  const puffs: FogPuff[] = [];
  for (let i = 0; i < FOG_COUNT; i += 1) {
    const material = new SpriteMaterial({
      map: textures[i % textures.length],
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    const sprite = new Sprite(material);
    const depth = (i / FOG_COUNT) * 2 - 1; // -1 behind, +1 in front
    const side = i % 2 === 0 ? -1 : 1;
    const home = new Vector3(
      side * (0.2 + ((i * 0.37) % 1.4)),
      -0.9 + ((i * 0.61) % 1.9),
      // Never inside the orb's depth, or the sprite plane cuts through the sphere and draws a rim.
      Math.sign(depth || 1) * (1.4 + Math.abs(depth) * 1.4),
    );
    const scale = 3.4 + ((i * 0.53) % 2.2) + Math.max(0, depth) * 1.5;
    sprite.scale.set(scale * 1.6, scale, 1);
    sprite.position.copy(home);
    scene.add(sprite);
    puffs.push({
      sprite,
      home,
      side,
      depth,
      // Behind the orb the mist is thick; in front it is a veil the orb shows through.
      baseOpacity: depth > 0 ? 0.06 + ((i * 0.29) % 0.08) : 0.45 + ((i * 0.29) % 0.3),
      phase: i * 1.7,
    });
  }

  const refreshColours = () => {
    // The logo's own body colour, so the orb matches the header mark in both themes.
    orbMaterial.color.copy(tokenColour("--colors-primary-mark"));
    // Mist is the canvas colour lifted a little towards the text colour: pale in Mint, a moonlit
    // haze in Midnight (the canvas colour alone reads as smoke on the dark theme).
    const canvas = tokenColour("--colors-surface-canvas");
    const fog = canvas.clone().lerp(tokenColour("--colors-text-primary"), dark() ? 0.05 : 0.02);
    for (const puff of puffs) (puff.sprite.material as SpriteMaterial).color.copy(fog);
  };
  refreshColours();

  // Layout: orb to the right of the copy on wide screens, above it on narrow ones.
  let wide = true;
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    wide = w / h > 1.1;
    camera.fov = wide ? 32 : 44;
    camera.updateProjectionMatrix();
    orbGroup.position.set(wide ? 1.75 : 0, wide ? 0 : 1.15, 0);
    orbGroup.scale.setScalar(wide ? 1 : 0.82);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // Pointer and device tilt move the camera a little; the orb stays the focus.
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (event: PointerEvent) => {
    lean.tx = (event.clientX / window.innerWidth - 0.5) * 2;
    lean.ty = (event.clientY / window.innerHeight - 0.5) * 2;
  };
  const onTilt = (event: DeviceOrientationEvent) => {
    if (event.gamma === null || event.beta === null) return;
    lean.tx = Math.max(-1, Math.min(1, event.gamma / 30));
    lean.ty = Math.max(-1, Math.min(1, (event.beta - 45) / 30));
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  // Android sends tilt without asking; iOS needs a permission prompt, which a hero should not show.
  window.addEventListener("deviceorientation", onTilt, { passive: true });

  // Run only while the hero is on screen and the tab is visible.
  let onScreen = true;
  let raf = 0;
  const intersection = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    schedule();
  });
  intersection.observe(hero);
  const onVisibility = () => schedule();
  document.addEventListener("visibilitychange", onVisibility);

  // Watch the first two seconds: a slow device drops resolution, then falls back to the still.
  let frames = 0;
  let watchStart = 0;
  let downgraded = false;
  let gaveUp = false;
  const checkSpeed = (now: number) => {
    if (downgraded && gaveUp) return;
    if (watchStart === 0) watchStart = now;
    frames += 1;
    const elapsed = now - watchStart;
    if (elapsed < 2000) return;
    const fps = (frames * 1000) / elapsed;
    frames = 0;
    watchStart = now;
    if (fps < 40 && !downgraded) {
      downgraded = true;
      pixelRatio = 1;
      renderer.setPixelRatio(pixelRatio);
      resize();
    } else if (fps < 28 && downgraded && !gaveUp) {
      gaveUp = true;
      onFallback("Too slow on this device");
    } else {
      gaveUp = gaveUp || downgraded;
      downgraded = true;
    }
  };

  const clock = { last: 0, t: 0 };
  const frame = (now: number) => {
    raf = 0;
    const dt = clock.last ? Math.min(0.05, (now - clock.last) / 1000) : 0;
    clock.last = now;
    clock.t += dt;
    checkSpeed(now);

    // Scroll progress: 0 with the hero's top at the top of the screen, 1 once half of it has gone.
    const rect = hero.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -rect.top / (rect.height * 0.5)));
    const eased = progress * progress * (3 - 2 * progress);

    lean.x += (lean.tx - lean.x) * 0.05;
    lean.y += (lean.ty - lean.y) * 0.05;
    camera.position.x = lean.x * 0.45;
    camera.position.y = 0.2 - lean.y * 0.3;
    camera.position.z = 8 - eased * 0.8;
    camera.lookAt(orbGroup.position.x * 0.6, wide ? 0 : 0.7, 0);

    orb.position.y = Math.sin(clock.t * 0.9) * 0.06;
    orb.rotation.y = clock.t * 0.15;
    shadow.scale.x = 1 - orb.position.y * 0.6;

    for (const puff of puffs) {
      const drift = Math.sin(clock.t * 0.18 + puff.phase) * 0.25;
      // Nearer puffs part sooner and further, so the fog opens around the orb.
      const part = eased * (2.6 + (puff.depth + 1) * 1.6);
      puff.sprite.position.set(
        orbGroup.position.x * 0.9 + puff.home.x + drift + puff.side * part,
        orbGroup.position.y * 0.8 +
          puff.home.y +
          Math.cos(clock.t * 0.12 + puff.phase) * 0.12 +
          eased * 0.4,
        puff.home.z,
      );
      const fade = Math.max(0, 1 - eased * (1.1 + (puff.depth + 1) * 0.35));
      (puff.sprite.material as SpriteMaterial).opacity = puff.baseOpacity * fade;
      puff.sprite.material.rotation = puff.phase + clock.t * 0.02 * puff.side;
    }

    renderer.render(scene, camera);
    schedule();
  };

  function schedule() {
    if (raf || !onScreen || document.hidden) {
      if (!onScreen || document.hidden) clock.last = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  }
  schedule();

  const onLost = (event: Event) => {
    event.preventDefault();
    onFallback("WebGL context lost");
  };
  renderer.domElement.addEventListener("webglcontextlost", onLost);

  return {
    refreshColours,
    dispose: () => {
      cancelAnimationFrame(raf);
      raf = 0;
      onScreen = false;
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onTilt);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      for (const texture of textures) texture.dispose();
      shadowMaterial.map?.dispose();
      environment.dispose();
      pmrem.dispose();
      scene.traverse((object) => {
        if (object instanceof Mesh || object instanceof Sprite) {
          object.geometry.dispose();
          (object.material as { dispose: () => void }).dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
