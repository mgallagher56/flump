import { type FC, useRef } from "react";
import { Footer } from "../../src/components/Footer";
import { Header } from "../../src/components/Header";
import { heroHeading, heroLead, mainContent } from "../../src/pages/HomePage/HomePage.styles";
import { PrototypeShell } from "../shared/PrototypeShell";
import { TIMING, usePace } from "../shared/pace";
import { usePointerLightAndTilt } from "../shared/round3";
import { ScrollCue, SectionNav } from "../shared/SectionNav";
import { useGsap } from "../shared/useGsap";
import { Journey, journeyStopId, LitCtas } from "./Journey";
import { Rest } from "./Rest";
import "./p9.css";
import "./p9-page.css";

/** The hero, inside the journey so the camera's opening view sits behind it. */
const Hero: FC = () => {
  const ref = useRef<HTMLElement>(null);
  const pace = usePace();
  // The lines arrive in reading order, slowly, a short distance each.
  useGsap(
    ref,
    ({ gsap }, root) => {
      gsap.from(root.querySelectorAll("[data-p9-hero]"), {
        y: 18,
        opacity: 0,
        duration: pace.s(TIMING.entry),
        ease: "calm",
        stagger: pace.s(TIMING.hero / 8),
        delay: pace.s(TIMING.stagger),
      });
    },
    [pace.pace],
  );
  return (
    <section
      aria-labelledby="home-title"
      className="p9-hero"
      data-proto-name="Start"
      data-proto-section=""
      ref={ref}
    >
      <div className="p9-hero__copy">
        <h1 className={heroHeading()} data-p9-hero="" id="home-title">
          All your money. One clear picture.
        </h1>
        <p className={heroLead()} data-p9-hero="">
          Accounts, budget, pay, savings, pension and debts in one place.
        </p>
        <div className="p9-ctas" data-p9-hero="">
          <LitCtas />
        </div>
        <div className="p9-hero__cue" data-p9-hero="">
          <ScrollCue
            href={`#${journeyStopId("accounts")}`}
            label="Five areas, then the full picture"
          />
        </div>
      </div>
    </section>
  );
};

const Page: FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  usePointerLightAndTilt(mainRef);
  return (
    <main className={mainContent()} id="main" ref={mainRef} tabIndex={-1}>
      <Journey intro={<Hero />} />
      <Rest />
    </main>
  );
};

/**
 * Prototype 9: the journey. Prototype 7's fly-through as the spine of the page, the stops swapping
 * sides, glass orbs and bubbles from prototype 6 in the palette's colours travelling through it,
 * and each stop showing its figures a different way. Then the rest of the home page, compact.
 */
export const P9: FC = () => (
  <PrototypeShell id="p9" paced panel="closed">
    <Header />
    <Page />
    <SectionNav />
    <Footer />
  </PrototypeShell>
);
