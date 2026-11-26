import { type FC, useEffect, useRef, useState } from "react";
import { BaselineSnapshotPreview } from "../../src/components/BaselineSnapshotPreview";
import { Footer } from "../../src/components/Footer";
import { Header } from "../../src/components/Header";
import { heroHeading, heroLead, mainContent } from "../../src/pages/HomePage/HomePage.styles";
import { StorySections } from "../p2/StorySections";
import { useMotion, useThemeVersion } from "../shared/motion";
import { PrototypeShell } from "../shared/PrototypeShell";
import { HeroCtas } from "../shared/sections";
import type { OrbScene } from "./orbScene";
import "./p3.css";

type SceneState = "still" | "loading" | "live";

interface NavigatorHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Why the still image shows instead of the 3D scene, or null when the scene may load. */
function stillReason(): string | null {
  const nav = navigator as NavigatorHints;
  if (nav.connection?.saveData) return "Data saver is on";
  if ((nav.deviceMemory ?? 8) < 4) return "Low device memory";
  if ((nav.hardwareConcurrency ?? 8) < 4) return "Few processor cores";
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
  if (!gl) return "No WebGL";
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return null;
}

const OrbHero: FC = () => {
  const { reduced } = useMotion();
  const themeVersion = useThemeVersion();
  const heroRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OrbScene | null>(null);
  const [state, setState] = useState<SceneState>("still");
  const [reason, setReason] = useState<string>("Waiting for first paint");

  useEffect(() => {
    if (reduced) {
      setReason("Reduced motion");
      return;
    }
    const why = stillReason();
    if (why) {
      setReason(why);
      return;
    }
    let cancelled = false;
    // Load three.js only after the page has painted and the browser is idle.
    const start = () => {
      if (cancelled || !stageRef.current || !heroRef.current) return;
      setState("loading");
      import("./orbScene").then(({ createOrbScene }) => {
        if (cancelled || !stageRef.current || !heroRef.current) return;
        sceneRef.current = createOrbScene({
          container: stageRef.current,
          hero: heroRef.current,
          onFallback: (why) => {
            setReason(why);
            setState("still");
          },
        });
        setState("live");
      });
    };
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const afterLoad = () => idle(start, { timeout: 1500 });
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", afterLoad);
      sceneRef.current?.dispose();
      sceneRef.current = null;
      setState("still");
    };
  }, [reduced]);

  useEffect(() => {
    if (themeVersion > 0) sceneRef.current?.refreshColours();
  }, [themeVersion]);

  return (
    <section aria-labelledby="home-title" className="p3-hero" data-scene={state} ref={heroRef}>
      <div aria-hidden="true" className="p3-stage" ref={stageRef}>
        <div className="p3-still">
          <span className="p3-still__fog p3-still__fog--back" />
          <span className="p3-still__shadow" />
          <span className="p3-still__orb" />
          <span className="p3-still__fog p3-still__fog--front" />
        </div>
      </div>
      <div className="p3-copy">
        <h1 className={heroHeading()} id="home-title">
          All your money. One clear picture.
        </h1>
        <p className={heroLead()}>
          Accounts, budget, pay, savings, pension and debts in one place.
        </p>
        <HeroCtas />
      </div>
      <div className="p3-dash">
        <BaselineSnapshotPreview />
      </div>
      <p className="p3-scene-note" data-testid="p3-scene-note">
        Scene: {state === "live" ? "3D" : `still image (${reason.toLowerCase()})`}
      </p>
    </section>
  );
};

/**
 * Prototype 3: a 3D hero. The Flump orb as a lit, glossy sphere in soft fog that parts as the
 * reader scrolls and leans with the pointer, then the sample dashboard and prototype 2's sections.
 */
export const P3: FC = () => (
  <PrototypeShell id="p3">
    <Header />
    <main className={mainContent()} id="main" tabIndex={-1}>
      <OrbHero />
      <StorySections />
    </main>
    <Footer />
  </PrototypeShell>
);
