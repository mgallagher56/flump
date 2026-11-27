import { Button } from "@repo/ui";
import { type FC, useRef } from "react";
import { Link } from "react-router-dom";
import { mainContent } from "../../../src/pages/HomePage/HomePage.styles";
import { NotFoundPicture } from "../../p11/art/Pictures";
import { usePointerLightAndTilt } from "../../shared/round3";
import { arriveAll, OBand } from "../blocks";
import { ProtoFooter } from "../chrome/ProtoFooter";
import { ProtoHeader } from "../chrome/ProtoHeader";
import { OtherShell } from "../OtherShell";
import type { OrbLayout } from "../scene/orbScene";
import { HeroOrbs } from "../scene/SceneLayers";

/*
 * Not found (family H). Production's words, the same as the web app's not-found state: one
 * heading, one sentence, one way back. In round one's language: one glass card with the owner's
 * pick for the not-found picture (the "Where next?" card, option B), arriving once, and one still
 * orb beside it. No live scene, no bubbles. Copy: production's NotFoundPage, word for word.
 */

const NOT_FOUND_COPY = {
  heading: "We cannot find that page",
  body: "The page may have moved, or the link may be out of date.",
  action: "Go to the home page",
} as const;

/**
 * One orb, clear of the card: just right of the narrow column on wide screens, small at the band's
 * top right corner otherwise.
 */
const ONE_ORB: OrbLayout = (width, height) => {
  const d = Math.min(130, height * 0.3);
  const right = width / 2 + 384 + 24 + d / 2;
  return right + d / 2 < width - 16
    ? [{ x: right / width, y: 0.32, d, tone: "violet" }]
    : [{ x: 1 - 34 / width, y: 30 / Math.max(height, 1), d: 36, tone: "violet" }];
};

const Body: FC = () => {
  const ref = useRef<HTMLElement>(null);
  usePointerLightAndTilt(ref, 6);
  return (
    <main className={mainContent()} id="main" ref={ref} tabIndex={-1}>
      <OBand
        className="o2-nf-band"
        id="not-found"
        labelledBy="not-found-title"
        moment={arriveAll(".o2-nf > *", 12)}
        tone="canvas"
        width="narrow"
      >
        <HeroOrbs layout={ONE_ORB} />
        <section aria-labelledby="not-found-title" className="o2-nf p11-soft-card">
          <div className="o2-nf__picture">
            <NotFoundPicture decorative />
          </div>
          <h1 className="o2-nf__title o1-close__title" id="not-found-title">
            {NOT_FOUND_COPY.heading}
          </h1>
          <p className="o2-nf__body">{NOT_FOUND_COPY.body}</p>
          <Button asChild variant="outline">
            <Link data-light="" to="/">
              {NOT_FOUND_COPY.action}
            </Link>
          </Button>
        </section>
      </OBand>
    </main>
  );
};

export const NotFoundProto: FC = () => (
  <OtherShell defaultLevel="s0" id="not-found" levels={["none", "s0"]}>
    <ProtoHeader />
    <Body />
    <ProtoFooter />
  </OtherShell>
);
