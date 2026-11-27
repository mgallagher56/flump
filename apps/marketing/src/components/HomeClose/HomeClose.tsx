import { Button, Card, Illustration, marketingMs } from "@repo/ui";
import { type FC, useRef } from "react";
import type { GsapKit } from "../../motion/loadGsapKit";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { signupCta } from "../../utils/site";
import { BubbleField } from "../BubbleField";
import { MarketingSection } from "../MarketingSection";
import {
  bubbleLayer,
  closeBand,
  closeCard,
  closePicture,
  closeText,
  closeTitle,
} from "./HomeClose.styles";

const TITLE_ID = "home-cta-title";

/**
 * The card rises, then the ticket, once, by time. Never scrubbed: this is the last band, so a
 * scrubbed run could stop half done at the page's end (MK2).
 */
export function closeMoment({ gsap }: GsapKit, root: HTMLElement): undefined {
  const entry = marketingMs("entry") / 1000;
  const timeline = gsap.timeline({
    scrollTrigger: { trigger: root, start: "top 88%", once: true },
    defaults: { ease: "calm", duration: entry, clearProps: "transform,opacity" },
  });
  timeline.from(root, { y: 16, opacity: 0 }, 0);
  const picture = root.querySelector("[data-close-picture]");
  if (picture) timeline.from(picture, { y: 10, opacity: 0 }, (marketingMs("stagger") / 1000) * 2);
}

/**
 * The home page's close (ROLLOUT-PLAN M1, from prototype 11): calm, on the card band like its
 * neighbours, with no dark band. The getting started ticket, the question, one line and the page's
 * second and last "Request an invite". The shared `ClosingCta` stays as it is for the other pages.
 */
export const HomeClose: FC = () => {
  const cta = signupCta();
  const cardRef = useRef<HTMLDivElement>(null);
  useGsapMoment(cardRef, closeMoment);

  return (
    <MarketingSection
      className={closeBand}
      id="get-started"
      labelledBy={TITLE_ID}
      tone="card"
      width="narrow"
    >
      <div className={bubbleLayer}>
        <BubbleField layout="b" />
      </div>
      <div ref={cardRef}>
        <Card material="glass" padding="lg">
          <div className={closeCard} data-testid="home-final-cta">
            <div
              className={closePicture}
              data-close-picture=""
              data-testid="home-final-cta-illustration"
            >
              <Illustration scene="onboarding" size="md" variant="document" />
            </div>
            <h2 className={closeTitle} id={TITLE_ID}>
              Ready to see where you stand?
            </h2>
            <p className={closeText}>Start with a few rough numbers.</p>
            <Button asChild size="lg" variant="primary">
              <a href={cta.href}>{cta.label}</a>
            </Button>
          </div>
        </Card>
      </div>
    </MarketingSection>
  );
};
