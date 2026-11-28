import { Button, Illustration } from "@repo/ui";
import { type FC, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { GlassOrb } from "../../components/GlassOrb";
import { Header } from "../../components/Header";
import { MarketingBand } from "../../components/MarketingBand";
import { MarketingPageShell } from "../../components/MarketingPageShell";
import { SoftCard } from "../../components/SoftCard";
import { arriveMoment } from "../../motion/moments/bandMoments";
import { useGsapMoment } from "../../motion/useGsapMoment";
import {
  mainContent,
  notFoundBody,
  notFoundCard,
  notFoundHeading,
  notFoundPicture,
  oneOrb,
  orbStage,
} from "./NotFoundPage.styles";

/** Same words as the web app's not-found state, so both sites read as one product (R2-10). */
const NOT_FOUND_COPY = {
  heading: "We cannot find that page",
  body: "The page may have moved, or the link may be out of date.",
  action: "Go to the home page",
} as const;

const cardArrives = arriveMoment("[data-arrive-item]", 12);

/**
 * The marketing 404 (R2-10; the approved not-found prototype, 27 Nov 2026, OTHER-PAGES-PLAN slice
 * P3): one glass card with the "Where next?" document picture, the heading, one sentence and one
 * way back, arriving once, and one still violet orb beside it (small at the band's top right on
 * narrower screens). No live scene and no bubbles.
 */
export const NotFoundPage: FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useGsapMoment(ref, cardArrives);
  return (
    <MarketingPageShell>
      <Helmet>
        <title>{`${NOT_FOUND_COPY.heading} | Flump`}</title>
        <meta name="robots" content="noindex" />
        <meta
          name="description"
          content="This page could not be found. Go to the Flump home page or browse the UK calculators."
        />
      </Helmet>
      <Header />
      <main className={mainContent} id="main" tabIndex={-1}>
        <MarketingBand id="not-found" tone="canvas" width="narrow">
          <span aria-hidden="true" className={orbStage} data-testid="not-found-orb">
            <GlassOrb className={oneOrb} tone="violet" />
          </span>
          <div ref={ref}>
            <SoftCard
              aria-labelledby="not-found-title"
              as="section"
              band="canvas"
              className={notFoundCard}
            >
              <div className={notFoundPicture} data-arrive-item="">
                <Illustration palette="orb" scene="not-found" size="sm" variant="document" />
              </div>
              <h1 className={notFoundHeading} data-arrive-item="" id="not-found-title">
                {NOT_FOUND_COPY.heading}
              </h1>
              <p className={notFoundBody} data-arrive-item="">
                {NOT_FOUND_COPY.body}
              </p>
              <div data-arrive-item="">
                <Button asChild variant="outline">
                  <Link to="/">{NOT_FOUND_COPY.action}</Link>
                </Button>
              </div>
            </SoftCard>
          </div>
        </MarketingBand>
      </main>
      <Footer />
    </MarketingPageShell>
  );
};
