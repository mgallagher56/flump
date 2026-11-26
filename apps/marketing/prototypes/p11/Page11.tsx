import { type ComponentType, type FC, useRef } from "react";
import { Footer } from "../../src/components/Footer";
import { Header } from "../../src/components/Header";
import { mainContent } from "../../src/pages/HomePage/HomePage.styles";
import { PrototypeShell } from "../shared/PrototypeShell";
import { usePointerLightAndTilt } from "../shared/round3";
import { SectionNav } from "../shared/SectionNav";
import { AssembleHero } from "./hero/AssembleHero";
import { JOURNEY_STOPS, type JourneyProps } from "./journeyTypes";
import { Close, Faq, Features, MoreDetail, RoughFigures, Security } from "./sections/Bands";
import { PayRise } from "./sections/PayRise";
import "./hero/hero.css";
import "./hero/pieces.css";
import "./page.css";

/** The journey's intro: a short heading so the first stop arrives as it scrolls in. */
const JourneyIntro: FC = () => (
  <header className="p11-journey__head">
    <h2 className="p11-journey__title" id="journey-title">
      From rough figures to one picture
    </h2>
    <p className="p11-journey__lead">
      Five areas, one at a time: what you have, what comes in and goes out, your pay, what you put
      by and what you owe. Then the picture they make.
    </p>
  </header>
);

/** The page inside the shell, so the pointer light and tilt read the shell's motion state. */
const Body: FC<{ Journey: ComponentType<JourneyProps> }> = ({ Journey }) => {
  const mainRef = useRef<HTMLElement>(null);
  usePointerLightAndTilt(mainRef);
  return (
    <main className={mainContent()} id="main" ref={mainRef} tabIndex={-1}>
      <AssembleHero />
      <Features />
      <div className="p11-journey-slot" id="journey">
        <Journey intro={<JourneyIntro />} stops={JOURNEY_STOPS} />
      </div>
      <RoughFigures />
      <PayRise />
      <Security />
      {/* Side by side on wide screens: two short lists that both deal out of one stack. */}
      <div className="p11-pair-bands">
        <MoreDetail />
        <Faq />
      </div>
      <Close />
    </main>
  );
};

/**
 * Prototype 11's page, with the journey as a slot (11 passes the three.js journey, 11b the CSS
 * one). Prototype 10 reworked: the assembling hero; the five areas with big glass emblems; a
 * longer journey (all five areas and the picture), where at every stop both sides arrive in one
 * beat, rest completely still while only the orb travels, then leave together; then prototype 8's
 * bands (the rough figures line with the check-in calendar, More detail and the questions dealing
 * out of one stack, the pay rise tool with gliding figures, the security shield, the close with
 * the glass steps). Every image is redrawn in the journey's glass family. Both bubble sets
 * together. Server-rendered and with reduced motion: the finished, still page.
 */
export const Page11: FC<{ id: "p11" | "p11b"; Journey: ComponentType<JourneyProps> }> = ({
  id,
  Journey,
}) => (
  <PrototypeShell backdrop="both" id={id} paced panel="closed">
    <Header />
    <Body Journey={Journey} />
    <SectionNav />
    <Footer />
  </PrototypeShell>
);
