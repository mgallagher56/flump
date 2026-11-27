import { Button } from "@repo/ui";
import { type FC, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { MONEY_AREAS } from "../../src/utils/featureAreas";
import { signupCta } from "../../src/utils/site";
import { GlassOrb } from "../p11/art/GlassOrb";
import { OnboardingPicture } from "../p11/art/Pictures";
import { STOP_ORB_TONES } from "../p11/journeyTypes";
import { TIMING } from "../shared/pace";
import { arriveAll, type Moment, OBand } from "./blocks";
import type { OrbLayout } from "./scene/orbScene";
import { HeroOrbs } from "./scene/SceneLayers";
import "./others2.css";

/*
 * Round two's shared pieces (OTHER-PAGES-PLAN R2), added beside round one's so its frozen pages
 * (64e1b45aa) are untouched: the closing band with the getting started ticket and the five areas
 * as pills. The legal header band is in legalBand.tsx, so a legal page loads none of this.
 */

/* ---------- Close: the getting started ticket, the page's own words ---------- */

const closeMoment: Moment = ({ gsap }, root, pace) => {
  const ticket = root.querySelector(".p11-r6-ticket");
  if (!ticket) return;
  gsap
    .timeline({
      scrollTrigger: { trigger: ticket, start: "top 88%", once: true },
      defaults: { ease: "calm" },
    })
    .from(ticket, { y: 16, opacity: 0, duration: pace.s(TIMING.entry) }, 0)
    .from(
      root.querySelectorAll(".p11-r6-ticket__parts li"),
      { y: 10, opacity: 0, duration: pace.s(TIMING.entry), stagger: pace.s(TIMING.stagger * 2) },
      pace.s(TIMING.stagger * 2),
    );
};

export const CloseBand: FC<{
  titleId: string;
  title: string;
  text: string;
  tone?: "canvas" | "card";
}> = ({ titleId, title, text, tone = "card" }) => {
  const cta = signupCta();
  return (
    <OBand
      bubbles="b"
      id="get-started"
      labelledBy={titleId}
      moment={closeMoment}
      tone={tone}
      width="narrow"
    >
      <div className="o1-close p11-soft-card">
        <OnboardingPicture decorative />
        <h2 className="o1-close__title" id={titleId}>
          {title}
        </h2>
        <p className="o1-close__text">{text}</p>
        <Button asChild size="lg" variant="primary">
          <a data-light="" href={cta.href}>
            {cta.label}
          </a>
        </Button>
      </div>
    </OBand>
  );
};

/* ---------- Part of one picture: the five areas as pills, none marked ---------- */

export const AreaPills: FC<{ tone: "canvas" | "card"; subtitle: string }> = ({
  tone,
  subtitle,
}) => (
  <OBand
    id="one-picture"
    moment={arriveAll(".o1-pill", 12)}
    subtitle={subtitle}
    title="Part of one picture"
    tone={tone}
  >
    <ul className="o1-pills">
      {MONEY_AREAS.map((a) => (
        <li className="o1-pill" key={a.key}>
          <a className="o1-pill__link" data-light="" href={a.path}>
            <GlassOrb size={26} tone={STOP_ORB_TONES[a.key][0]} />
            <span>{a.name}</span>
          </a>
        </li>
      ))}
    </ul>
  </OBand>
);
