import { type FC, Fragment, type ReactNode, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BaselineSnapshotPreview } from "../../src/components/BaselineSnapshotPreview";
import { Footer } from "../../src/components/Footer";
import { Header } from "../../src/components/Header";
import {
  hero,
  heroHeading,
  heroInner,
  heroLead,
  heroText,
  mainContent,
} from "../../src/pages/HomePage/HomePage.styles";
import { useMotion } from "../shared/motion";
import { PrototypeShell } from "../shared/PrototypeShell";
import { ScrollCue, SectionNav } from "../shared/SectionNav";
import {
  ClosingSection,
  FaqSection,
  FeaturesSection,
  HeroCtas,
  MoreDetailSection,
  PaySection,
  RoughFiguresSection,
  SecuritySection,
} from "../shared/sections";
import { enhance } from "./interactions";
import "./p1b.css";

const HEADLINE = ["All", "your", "money.", "One", "clear", "picture."];

/** A section stop for the previous and next buttons, labelled by the band's own heading. */
const Stop: FC<{ name: string; labelledBy: string; children: ReactNode }> = ({
  name,
  labelledBy,
  children,
}) => (
  <section aria-labelledby={labelledBy} data-proto-name={name} data-proto-section="">
    {children}
  </section>
);

/** Runs the pointer, count, heading, theme and page transition enhancements after hydration. */
const Enhancements: FC<{ root: React.RefObject<HTMLDivElement | null> }> = ({ root }) => {
  const { reduced } = useMotion();
  const navigate = useNavigate();
  useEffect(() => {
    const element = root.current?.closest<HTMLElement>(".proto");
    if (!element) return;
    return enhance(element, { reduced, navigate });
  }, [reduced, navigate, root]);
  return null;
};

/**
 * Prototype 1b: prototype 1 taken further with a little hand-written script (no library). Buttons
 * with a considered press and a light that follows the pointer; tiles and the sample dashboard
 * that lean toward the pointer (and the finger on touch); the logo orb that watches the pointer
 * and gives to fast scrolling; headings that settle word by word; sample figures that count to
 * their value once; a theme switch that wipes from where you pressed; page transitions; animated
 * focus rings; the scroll cue and the section buttons. Prototype 1 is unchanged for comparison.
 */
export const P1b: FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <PrototypeShell id="p1b" panel="closed">
      <div aria-hidden="true" className="p1b-progress" ref={ref} />
      <Enhancements root={ref} />
      <Header />
      <main className={mainContent()} id="main" tabIndex={-1}>
        <section
          aria-labelledby="home-title"
          className={`${hero()} p1b-hero`}
          data-proto-name="Home"
          data-proto-section=""
        >
          <div className={heroInner()}>
            <div className={heroText()}>
              <h1 className={heroHeading()} id="home-title">
                {HEADLINE.map((word, index) => (
                  <Fragment key={word}>
                    {index > 0 && " "}
                    <span
                      className="p1b-word"
                      style={{ "--proto-i": index } as React.CSSProperties}
                    >
                      {word}
                    </span>
                  </Fragment>
                ))}
              </h1>
              <p className={`${heroLead()} p1b-lead`}>
                Accounts, budget, pay, savings, pension and debts in one place.
              </p>
              <HeroCtas />
            </div>
            <div className="p1b-preview">
              <BaselineSnapshotPreview />
            </div>
            <ScrollCue href="#features" label="See the five areas" />
          </div>
        </section>

        <Stop labelledBy="features-title" name="Features">
          <FeaturesSection />
        </Stop>
        <Stop labelledBy="rough-figures-title" name="Rough figures">
          <RoughFiguresSection />
        </Stop>
        <Stop labelledBy="more-detail-title" name="More detail">
          <MoreDetailSection />
        </Stop>
        <Stop labelledBy="pay-rise-title" name="Pay rise">
          <PaySection />
        </Stop>
        <Stop labelledBy="security-title" name="Security">
          <SecuritySection />
        </Stop>
        <Stop labelledBy="faq-title" name="Questions">
          <FaqSection />
        </Stop>
        <Stop labelledBy="home-cta-title" name="Get started">
          <ClosingSection />
        </Stop>
      </main>
      <SectionNav />
      <Footer />
    </PrototypeShell>
  );
};
