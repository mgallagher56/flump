import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ORB_TONES, type OrbTone } from "../../components/GlassOrb/GlassOrb";
import type { SceneHandle, SceneVerdict } from "../../components/SceneStage/SceneStage";
import {
  frameAction,
  frameDelta,
  isDarkCanvas,
  sceneLook,
  shouldLoop,
} from "../journey/journeyFrame";
import { floatOffset, type OrbPlace, readOrbPlaces, worldPerPixel } from "./heroOrbLayout";

/*
 * The other pages' hero scene (scene level S1, OTHER-PAGES-PLAN section 4; the approved features
 * and area prototypes, `prototypes/others/scene/orbScene.ts`): a few glass orbs in the journey's
 * own material, floating very slowly in place in the first band. No track, no beads, no floor and
 * no camera travel; nothing is tied to scroll. Only reached by `loadHeroOrbScene`'s dynamic import,
 * after first paint, never under reduced motion, and only when `useScenePower` says live.
 *
 * The orbs sit exactly where the still CSS orbs sit (`HeroOrbs`), read from the page on every
 * resize, so the change from still to live is the same picture. Colours are the orb and canvas
 * tokens read back as computed CSS colours, never written here. Refraction only sees opaque
 * things, so an opaque plane in the band's colour sits behind the orbs.
 *
 * Rendering pauses in a hidden tab, while the band is off screen and while ambient motion is
 * paused (MK14). The frame rate check drops to a pixel ratio of 1, then gives up (the still comes
 * back).
 */

export interface HeroOrbSceneOptions {
  /** The stage: holds the still orbs (`[data-glass-orb]`) and the canvas the scene adds. */
  readonly container: HTMLElement;
  readonly frameCheck: { tick(now: number): SceneVerdict | null; reset(): void };
  readonly running: boolean;
  readonly onVerdict: (verdict: SceneVerdict) => void;
  readonly onLost: () => void;
  readonly onFirstFrame: () => void;
}

/** A long lens, so a wide band does not stretch the orbs near its edges into ellipses. */
const FOV = 10;
const DIST = 42;
const TAN = Math.tan((FOV * Math.PI) / 360);
/** The prototype's pace for these pages (Calm, 1.4 times its base clock). */
const PACE = 1.4;

/** A coloured Fresnel rim and a faint glow, as the journey's orb (`journeyScene.ts`). */
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
          outgoingLight += uRimColour * (rimF * uRimStrength + uGlow);
        }
        #include <opaque_fragment>`,
      );
  };
}

/** Resolves a CSS colour to sRGB through a 1px canvas. */
function toColour(css: string, ctx: CanvasRenderingContext2D | null, out = new Color()): Color {
  if (!ctx || !css) return out.setRGB(1, 1, 1);
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return out.setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
}

export function createHeroOrbScene(options: HeroOrbSceneOptions): SceneHandle {
  const { container, frameCheck } = options;
  let disposed = false;
  let running = options.running;

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
  canvas.dataset.heroCanvas = "";
  container.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 200);
  camera.position.set(0, 0, DIST);
  scene.add(camera);
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  scene.environment = environment;

  const backdropMaterial = new MeshBasicMaterial({ toneMapped: false, depthWrite: false });
  const backdrop = new Mesh(new PlaneGeometry(1, 1), backdropMaterial);
  backdrop.position.z = -60;
  backdrop.renderOrder = -10;
  camera.add(backdrop);

  const key = new DirectionalLight(new Color(1, 1, 1), 1.6);
  key.position.set(-4, 8, 6);
  scene.add(key);

  const white = new Color(1, 1, 1);
  const glass = ORB_TONES.map(() => {
    const material = new MeshPhysicalMaterial({
      transmission: 1,
      ior: 1.5,
      roughness: 0.04,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      specularIntensity: 1,
      iridescence: 0.18,
      iridescenceIOR: 1.3,
      thickness: 1.1,
      attenuationDistance: 0.8,
      dispersion: 0.3,
    });
    const rim = { colour: new Color(1, 1, 1), strength: { value: 0.9 }, glow: { value: 0 } };
    addRim(material, rim);
    return { material, rim };
  });
  const toneColour = ORB_TONES.map(() => new Color());
  const toneIndex = (tone: OrbTone) => Math.max(0, ORB_TONES.indexOf(tone));

  const geometry = new SphereGeometry(1, 64, 44);
  const group = new Group();
  scene.add(group);
  type Orb = { mesh: Mesh; light: PointLight; place: OrbPlace; phase: number; speed: number };
  let orbs: Orb[] = [];
  const size = { width: 1, height: 1 };

  const place = () => {
    const places = readOrbPlaces(container);
    if (places.length !== orbs.length) {
      for (const orb of orbs) {
        group.remove(orb.mesh);
        scene.remove(orb.light);
      }
      orbs = places.map((p, i) => {
        const mesh = new Mesh(geometry, glass[toneIndex(p.tone)]?.material);
        const light = new PointLight(new Color(1, 1, 1), 0, 12, 1.6);
        group.add(mesh);
        scene.add(light);
        return { mesh, light, place: p, phase: i * 1.7, speed: 0.9 + (i % 3) * 0.15 };
      });
    }
    const u = worldPerPixel(size.height, DIST, TAN);
    places.forEach((p, i) => {
      const orb = orbs[i];
      if (!orb) return;
      orb.place = p;
      orb.mesh.material = glass[toneIndex(p.tone)]?.material ?? orb.mesh.material;
      const r = (p.d / 2) * u;
      orb.mesh.scale.setScalar(r);
      orb.mesh.position.set((p.x - 0.5) * size.width * u, (0.5 - p.y) * size.height * u, 0);
      orb.light.position.set(orb.mesh.position.x - r * 1.6, orb.mesh.position.y + r, -r * 1.4);
      orb.light.distance = r * 8;
      orb.light.color.copy(toneColour[toneIndex(p.tone)] ?? white);
    });
    const h = 2 * (DIST + 60) * TAN;
    backdrop.scale.set(h * camera.aspect * 1.2, h * 1.2, 1);
  };

  const layout = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    size.width = width;
    size.height = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    place();
  };

  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  let dark = false;
  const refreshColours = () => {
    const swatch = container.querySelector<HTMLElement>("[data-scene-swatch='canvas']");
    const canvasColour = toColour(swatch ? getComputedStyle(swatch).color : "", probe);
    dark = isDarkCanvas(canvasColour.r, canvasColour.g, canvasColour.b);
    const look = sceneLook(dark);
    backdropMaterial.color.copy(canvasColour);
    ORB_TONES.forEach((name, i) => {
      const tone = toneColour[i];
      const entry = glass[i];
      if (!tone || !entry) return;
      const still = container.querySelector<HTMLElement>(`[data-orb-tone="${name}"]`);
      toColour(still ? getComputedStyle(still).color : "", probe, tone);
      const m = entry.material;
      m.transmission = look.glassTransmission;
      m.envMapIntensity = look.glassEnvIntensity;
      m.roughness = look.glassRoughness;
      m.thickness = look.orbThickness;
      m.attenuationDistance = look.orbAttenuationDistance;
      m.attenuationColor.copy(white).lerp(tone, dark ? 0.85 : 0.7);
      m.color.copy(white).lerp(tone, dark ? 0.9 : 0.75);
      m.emissive.copy(tone);
      m.emissiveIntensity = dark ? 0.08 : 0;
      entry.rim.colour.copy(tone);
      entry.rim.strength.value = dark ? 1.2 : 0.8;
      entry.rim.glow.value = dark ? 0.06 : 0;
    });
    for (const orb of orbs) orb.light.color.copy(toneColour[toneIndex(orb.place.tone)] ?? white);
    key.intensity = dark ? 1.3 : 1.8;
  };

  let clock = 0;
  let firstFrame = true;
  const draw = (dt: number) => {
    clock += dt * PACE;
    const u = worldPerPixel(size.height, DIST, TAN);
    for (const orb of orbs) {
      const r = (orb.place.d / 2) * u;
      const baseY = (0.5 - orb.place.y) * size.height * u;
      const float = floatOffset(clock, orb.phase, orb.speed);
      orb.mesh.position.y = baseY + float.lift * r;
      orb.mesh.rotation.y = float.turn;
      orb.light.intensity = dark ? 10 : 8;
    }
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      options.onFirstFrame();
    }
  };

  let onScreen = false;
  let raf = 0;
  let last = 0;
  const frame = (now: number) => {
    raf = 0;
    const dt = frameDelta(now, last);
    last = now;
    const verdict = frameCheck.tick(now);
    const action = frameAction(verdict);
    if (action === "downgrade") {
      renderer.setPixelRatio(1);
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
    if (!running) draw(0);
    schedule();
  });
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    if (onScreen) schedule();
    else stop();
  });
  intersection.observe(container);
  const onVisibility = () => (document.hidden ? stop() : schedule());
  document.addEventListener("visibilitychange", onVisibility);
  const onLost = (event: Event) => {
    event.preventDefault();
    options.onLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  layout();
  refreshColours();
  // A first frame even when ambient motion starts paused, so the scene is drawn in place.
  draw(0);

  return {
    setRunning(next) {
      running = next;
      if (running) schedule();
      else {
        stop();
        draw(0);
      }
    },
    refreshColours() {
      refreshColours();
      if (!running) draw(0);
    },
    dispose() {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      for (const entry of glass) entry.material.dispose();
      geometry.dispose();
      backdrop.geometry.dispose();
      backdropMaterial.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
