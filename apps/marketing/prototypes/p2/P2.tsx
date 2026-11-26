import type { FC } from "react";
import { BaselineSnapshotPreview } from "../../src/components/BaselineSnapshotPreview";
import { Footer } from "../../src/components/Footer";
import { Header } from "../../src/components/Header";
import { heroHeading, heroLead, mainContent } from "../../src/pages/HomePage/HomePage.styles";
import { PrototypeShell } from "../shared/PrototypeShell";
import { HeroCtas } from "../shared/sections";
import { StorySections } from "./StorySections";

/**
 * Prototype 2: scroll storytelling. The hero's sample dashboard sits behind fog that thins as the
 * reader scrolls, until the figures are sharp (native CSS scroll-driven animations, no script).
 * Below it, a pinned section steps through the five areas (GSAP ScrollTrigger) and the bands move
 * on layers at different depths.
 */
export const P2: FC = () => (
  <PrototypeShell id="p2">
    <Header />
    <main className={mainContent()} id="main" tabIndex={-1}>
      <section aria-labelledby="home-title" className="p2-hero">
        <div className="p2-stage">
          <div className="p2-copy">
            <h1 className={`${heroHeading()} p2-title`} id="home-title">
              All your money. One clear picture.
            </h1>
            <p className={heroLead()}>
              Accounts, budget, pay, savings, pension and debts in one place.
            </p>
            <HeroCtas />
          </div>
          <div className="p2-dash">
            <BaselineSnapshotPreview />
            <div aria-hidden="true" className="p2-haze p2-haze--thick" />
            <div aria-hidden="true" className="p2-haze p2-haze--thin" />
          </div>
          <div aria-hidden="true" className="p2-fog">
            <span className="p2-fog__layer p2-fog__layer--1" />
            <span className="p2-fog__layer p2-fog__layer--2" />
            <span className="p2-fog__layer p2-fog__layer--3" />
            <span className="p2-fog__layer p2-fog__layer--4" />
          </div>
          <p aria-hidden="true" className="p2-hint">
            Scroll to clear the fog
          </p>
        </div>
      </section>
      <StorySections />
    </main>
    <Footer />
  </PrototypeShell>
);
