import { type FC, useRef } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../../src/components/Footer";
import { Header } from "../../src/components/Header";
import {
  bandLink,
  heroHeading,
  heroLead,
  mainContent,
} from "../../src/pages/HomePage/HomePage.styles";
import { MONEY_AREAS } from "../../src/utils/featureAreas";
import { PrototypeShell } from "../shared/PrototypeShell";
import { ScrollCue, SectionNav } from "../shared/SectionNav";
import {
  ClosingSection,
  FaqSection,
  HeroCtas,
  MoreDetailSection,
  PaySection,
  RoughFiguresSection,
  SecuritySection,
} from "../shared/sections";
import { useLazyScene } from "../shared/useLazyScene";
import { STOP_CARDS } from "./StopCards";
import "./p7.css";

/** The rest of the home page, each band a stop for the section buttons. */
const REST = [
  { name: "Rough figures", heading: "rough-figures-title", Section: RoughFiguresSection },
  { name: "More detail", heading: "more-detail-title", Section: MoreDetailSection },
  { name: "Pay rise", heading: "pay-rise-title", Section: PaySection },
  { name: "Security", heading: "security-title", Section: SecuritySection },
  { name: "Questions", heading: "faq-title", Section: FaqSection },
  { name: "Get started", heading: "home-cta-title", Section: ClosingSection },
] as const;

const FlyThrough: FC = () => {
  const flightRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { state, reason } = useLazyScene(stageRef, async (container, fallback) => {
    const { createFlyScene } = await import("./flyScene");
    const flight = flightRef.current;
    if (!flight) throw new Error("No flight path");
    return createFlyScene({ container, flight, onFallback: fallback });
  });

  return (
    <div className="p7-flight" data-scene={state} ref={flightRef}>
      <div aria-hidden="true" className="p7-stage" ref={stageRef} />

      <section
        aria-labelledby="home-title"
        className="p7-hero"
        data-proto-name="Start"
        data-proto-section=""
      >
        <div className="p7-hero__copy">
          <h1 className={heroHeading()} id="home-title">
            All your money. One clear picture.
          </h1>
          <p className={heroLead()}>
            Accounts, budget, pay, savings, pension and debts in one place.
          </p>
          <div className="p7-ctas">
            <HeroCtas />
          </div>
          <div className="p7-hero__cue">
            <ScrollCue href="#p7-stop-accounts" label="Five areas, then the full picture" />
          </div>
        </div>
      </section>

      {MONEY_AREAS.map((area, index) => {
        const StopCard = STOP_CARDS[area.key];
        return (
          <section
            aria-labelledby={`p7-stop-${area.key}-title`}
            className="p7-stop"
            data-proto-name={area.name}
            data-proto-section=""
            data-stop={index + 1}
            id={`p7-stop-${area.key}`}
            key={area.key}
          >
            <div className="p7-stop__panel">
              <h2 className="p7-stop__title" id={`p7-stop-${area.key}-title`}>
                {area.h1}
              </h2>
              <p className="p7-stop__lead">{area.lead}</p>
              <p className="p7-stop__fact">{area.facts[0]}</p>
              <Link className={bandLink()} to={area.path}>
                About {area.name.toLowerCase()} in Flump
              </Link>
            </div>
            <div className="p7-stop__card">
              <StopCard />
            </div>
          </section>
        );
      })}

      <section
        aria-labelledby="p7-stop-dashboard-title"
        className="p7-stop p7-stop--final"
        data-proto-name="The picture"
        data-proto-section=""
        data-stop={MONEY_AREAS.length + 1}
        id="p7-stop-dashboard"
      >
        <div className="p7-stop__panel">
          <h2 className="p7-stop__title" id="p7-stop-dashboard-title">
            Where you stand, on one page
          </h2>
          <p className="p7-stop__lead">
            Your Home page shows your net worth, what is left over each month and your breathing
            room.
          </p>
          <p className="p7-stop__fact">
            Breathing room is how long your savings would cover the essentials.
          </p>
          <div className="p7-ctas">
            <HeroCtas />
          </div>
        </div>
        <div className="p7-stop__card">
          <STOP_CARDS.dashboard />
        </div>
      </section>

      <p className="p7-scene-note" data-testid="p7-scene-note">
        Scene: {state === "live" ? "3D" : `still (${reason.toLowerCase()})`}
      </p>
    </div>
  );
};

/**
 * Prototype 7: a fly-through in depth. The camera moves forward through layered space as the
 * reader scrolls, past one sample card per area, and comes to rest on the finished Home page.
 * The copy for each stop is in normal flow; the 3D cards are aria-hidden copies of the still ones.
 */
export const P7: FC = () => (
  <PrototypeShell id="p7" panel="closed">
    <Header />
    <main className={mainContent()} id="main" tabIndex={-1}>
      <FlyThrough />
      <div className="p7-rest">
        {REST.map(({ name, heading, Section }) => (
          // biome-ignore lint/a11y/useAriaPropsSupportedByRole: SectionNav reads the label to find each stop's heading.
          <div aria-labelledby={heading} data-proto-name={name} data-proto-section="" key={heading}>
            <Section />
          </div>
        ))}
      </div>
    </main>
    <SectionNav />
    <Footer />
  </PrototypeShell>
);
