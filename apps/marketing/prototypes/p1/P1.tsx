import { type FC, Fragment } from "react";
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
import { PrototypeShell } from "../shared/PrototypeShell";
import {
  ClosingSection,
  FaqSection,
  FeaturesSection,
  HeroCtas,
  MoreDetailSection,
  PaySection,
  Reveal,
  RoughFiguresSection,
  SecuritySection,
} from "../shared/sections";
import "./p1.css";

const HEADLINE = ["All", "your", "money.", "One", "clear", "picture."];

/**
 * Prototype 1: micro-interactions, CSS only. The one motif is fog lifting: the headline's words and
 * each band's heading clear from a soft blur as they arrive. Everything else answers the reader:
 * hover, focus and press. No JavaScript drives any of it.
 */
export const P1: FC = () => (
  <PrototypeShell id="p1">
    <div aria-hidden="true" className="p1-progress" />
    <Header />
    <main className={mainContent()} id="main" tabIndex={-1}>
      <section aria-labelledby="home-title" className={`${hero()} p1-hero`}>
        <div className={heroInner()}>
          <div className={heroText()}>
            <h1 className={heroHeading()} id="home-title">
              {HEADLINE.map((word, index) => (
                <Fragment key={word}>
                  {index > 0 && " "}
                  <span className="p1-word" style={{ "--proto-i": index } as React.CSSProperties}>
                    {word}
                  </span>
                </Fragment>
              ))}
            </h1>
            <p className={`${heroLead()} p1-lead`}>
              Accounts, budget, pay, savings, pension and debts in one place.
            </p>
            <HeroCtas />
          </div>
          <div className="p1-preview">
            <BaselineSnapshotPreview />
          </div>
        </div>
      </section>

      <Reveal>
        <FeaturesSection />
      </Reveal>
      <Reveal>
        <RoughFiguresSection />
      </Reveal>
      <Reveal>
        <MoreDetailSection />
      </Reveal>
      <Reveal>
        <PaySection />
      </Reveal>
      <Reveal>
        <SecuritySection />
      </Reveal>
      <Reveal>
        <FaqSection />
      </Reveal>
      <Reveal>
        <ClosingSection />
      </Reveal>
    </main>
    <Footer />
  </PrototypeShell>
);
