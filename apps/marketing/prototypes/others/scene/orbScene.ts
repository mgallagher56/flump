import {
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
} from "three";
import { ORB_TONE_TOKEN, type OrbToneName } from "../../p11/journeyTypes";
import { isDark, tokenColour } from "../../shared/threeKit";
import type { SceneHandle } from "../../shared/useLazyScene";
import { createStage } from "./stage";

/*
 * The other pages' live scene (levels S1 and S2): a few glass orbs in the journey's own material,
 * floating very slowly in place. No track, no beads, no floor and no camera travel; nothing is tied
 * to scroll. The glass, rim and colour settings are copied from p11/journeyScene.ts (that file is
 * prototype 11's and stays untouched), so the orbs read as the journey's orb at rest.
 *
 * Each orb is placed in screen terms (a share of the stage's width and height, and a diameter in
 * CSS pixels) by the page's own layout, chosen again on every resize so orbs keep away from text.
 * Refraction only sees opaque things, so an opaque plane in the band's colour sits behind them.
 */

export interface OrbSpec {
  /** Centre, as a share of the stage's width (0 left, 1 right). */
  x: number;
  /** Centre, as a share of the stage's height (0 top, 1 bottom). */
  y: number;
  /** Diameter in CSS pixels. */
  d: number;
  tone: OrbToneName;
}

export type OrbLayout = (width: number, height: number) => readonly OrbSpec[];

const FOV = 35;
const DIST = 12;
const TAN = Math.tan((FOV * Math.PI) / 360);

/** The journey's rim: a coloured Fresnel edge and a faint glow (copied from journeyScene). */
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

const TONES: OrbToneName[] = ["sky", "teal", "violet", "rose"];

export function createOrbScene({
  container,
  layout,
  backdropToken,
  running,
  getPace,
  onFallback,
}: {
  container: HTMLElement;
  layout: OrbLayout;
  /** The token of the colour behind the orbs (the band's, or the page's for S2). */
  backdropToken: string;
  running: boolean;
  getPace: () => number;
  onFallback: (reason: string) => void;
}): SceneHandle & { setRunning: (running: boolean) => void } {
  const stage = createStage({ container, onFallback, fov: FOV, running });
  const { scene, camera, renderer } = stage;
  camera.position.set(0, 0, DIST);
  scene.add(camera);

  const backdropMaterial = new MeshBasicMaterial({ toneMapped: false, depthWrite: false });
  const backdrop = new Mesh(new PlaneGeometry(1, 1), backdropMaterial);
  backdrop.position.z = -60;
  backdrop.renderOrder = -10;
  camera.add(backdrop);

  const key = new DirectionalLight(new Color(1, 1, 1), 1.6);
  key.position.set(-4, 8, 6);
  scene.add(key);

  // One glass per tone, each with its own rim colour.
  const white = new Color(1, 1, 1);
  const glass = TONES.map(() => {
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
  const toneColour = TONES.map(() => new Color());

  const geometry = new SphereGeometry(1, 64, 44);
  const group = new Group();
  type Orb = { mesh: Mesh; light: PointLight; spec: OrbSpec; phase: number; speed: number };
  let orbs: Orb[] = [];

  /** World units per CSS pixel at the orbs' depth. */
  const unit = () => (2 * DIST * TAN) / Math.max(1, stage.size.height);

  const place = () => {
    const { width, height } = stage.size;
    const specs = layout(width, height);
    // Rebuild only when the number of orbs changes; otherwise move them.
    if (specs.length !== orbs.length) {
      for (const orb of orbs) {
        group.remove(orb.mesh);
        scene.remove(orb.light);
      }
      orbs = specs.map((spec, i) => {
        const mesh = new Mesh(geometry, glass[TONES.indexOf(spec.tone)]?.material);
        const light = new PointLight(new Color(1, 1, 1), 0, 12, 1.6);
        group.add(mesh);
        scene.add(light);
        return { mesh, light, spec, phase: i * 1.7, speed: 0.9 + (i % 3) * 0.15 };
      });
    }
    const u = unit();
    specs.forEach((spec, i) => {
      const orb = orbs[i];
      if (!orb) return;
      orb.spec = spec;
      orb.mesh.material = glass[TONES.indexOf(spec.tone)]?.material ?? orb.mesh.material;
      const r = (spec.d / 2) * u;
      orb.mesh.scale.setScalar(r);
      orb.mesh.position.set((spec.x - 0.5) * width * u, (0.5 - spec.y) * height * u, 0);
      orb.light.position.set(orb.mesh.position.x - r * 1.6, orb.mesh.position.y + r, -r * 1.4);
      orb.light.distance = r * 8;
      orb.light.color.copy(toneColour[TONES.indexOf(spec.tone)] ?? white);
    });
    const h = 2 * (DIST + 60) * TAN;
    backdrop.scale.set(h * camera.aspect * 1.2, h * 1.2, 1);
  };
  stage.onResize(place);

  let dark = isDark();
  const refreshColours = () => {
    dark = isDark();
    backdropMaterial.color.copy(tokenColour(backdropToken));
    TONES.forEach((name, i) => {
      const tone = toneColour[i];
      const entry = glass[i];
      if (!tone || !entry) return;
      tone.copy(tokenColour(ORB_TONE_TOKEN[name]));
      const m = entry.material;
      // The journey's settings for its orb: Midnight a little diffuse, Mint nearly clear.
      m.transmission = dark ? 0.88 : 0.94;
      m.envMapIntensity = dark ? 1.05 : 0.75;
      m.roughness = dark ? 0.05 : 0.04;
      m.thickness = dark ? 0.9 : 0.8;
      m.attenuationDistance = dark ? 0.8 : 1.6;
      m.attenuationColor.copy(white).lerp(tone, dark ? 0.85 : 0.7);
      m.color.copy(white).lerp(tone, dark ? 0.9 : 0.75);
      m.emissive.copy(tone);
      m.emissiveIntensity = dark ? 0.08 : 0;
      entry.rim.colour.copy(tone);
      entry.rim.strength.value = dark ? 1.2 : 0.8;
      entry.rim.glow.value = dark ? 0.06 : 0;
    });
    for (const orb of orbs) {
      orb.light.color.copy(toneColour[TONES.indexOf(orb.spec.tone)] ?? white);
    }
    key.intensity = dark ? 1.3 : 1.8;
  };
  refreshColours();

  // Very slow floating: a period of about ten seconds at Calm, a drift of a tenth of the radius.
  let clock = 0;
  stage.onFrame(({ dt }) => {
    clock += dt * getPace();
    const u = unit();
    for (const orb of orbs) {
      const r = (orb.spec.d / 2) * u;
      const baseY = (0.5 - orb.spec.y) * stage.size.height * u;
      orb.mesh.position.y = baseY + Math.sin(clock * 0.6 * orb.speed + orb.phase) * r * 0.1;
      orb.mesh.rotation.y = clock * 0.08 * orb.speed + orb.phase;
      orb.light.intensity = dark ? 10 : 8;
    }
  });

  let disposed = false;
  const addGlass = () => {
    if (!disposed) scene.add(group);
  };
  place();
  renderer.compileAsync(group, camera, scene).then(addGlass, addGlass);

  return {
    refreshColours,
    setRunning: stage.setRunning,
    dispose: () => {
      disposed = true;
      scene.add(group);
      for (const entry of glass) entry.material.dispose();
      geometry.dispose();
      stage.dispose();
    },
  };
}
