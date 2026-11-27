import { Card, Illustration, marketingMs } from "@repo/ui";
import { type FC, useRef } from "react";
import { Link } from "react-router-dom";
import type { GsapKit } from "../../motion/loadGsapKit";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { BubbleField } from "../BubbleField";
import { MarketingSection } from "../MarketingSection";
import {
  bubbleLayer,
  securityBand,
  securityBody,
  securityLink,
  securityMore,
  securityPicture,
  securityRow,
  securityText,
  securityTitle,
} from "./HomeSecurity.styles";

/** The card arrives, then the picture and the words in turn: once, by time (MK2). */
export function securityMoment({ gsap }: GsapKit, root: HTMLElement): undefined {
  const stagger = marketingMs("stagger") / 1000;
  const timeline = gsap.timeline({
    scrollTrigger: { trigger: root, start: "top 86%", once: true },
    defaults: { ease: "calm", duration: marketingMs("entry") / 1000 },
  });
  timeline
    .from(root, { y: 16, opacity: 0, clearProps: "transform,opacity" }, 0)
    .from(
      root.querySelectorAll("[data-security-part]"),
      { y: 12, opacity: 0, stagger, clearProps: "transform,opacity" },
      stagger,
    );
}

/**
 * Security and privacy on the home page (ROLLOUT-PLAN M1, from prototype 11): a glass card like its
 * neighbours on the card band, never a solid band, with the security document picture beside one
 * sentence of facts and a link to `/security`, which holds the detail. It promises no feature that
 * does not exist today.
 */
export const HomeSecurity: FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  useGsapMoment(cardRef, securityMoment);

  return (
    <MarketingSection
      className={securityBand}
      data-testid="security-privacy-section"
      id="security"
      labelledBy="security-title"
      tone="card"
    >
      <div className={bubbleLayer}>
        <BubbleField layout="a" />
      </div>
      <div data-testid="security-card" ref={cardRef}>
        <Card material="glass" padding="lg">
          <div className={securityRow}>
            <div className={securityPicture} data-security-part="">
              <Illustration scene="security" size="sm" variant="document" />
            </div>
            <div className={securityText}>
              <h2 className={securityTitle} data-security-part="" id="security-title">
                Security and privacy
              </h2>
              <p className={securityBody} data-security-part="">
                You type in your own figures, so no bank login is needed. Flump has no feature to
                make payments or move money.
              </p>
              <p className={securityMore} data-security-part="">
                <Link className={securityLink} to="/security">
                  What Flump can and cannot do
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </MarketingSection>
  );
};
