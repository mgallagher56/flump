import { Button, Card, marketingMs } from "@repo/ui";
import { type FC, type ReactNode, useRef } from "react";
import type { GsapKit } from "../../motion/loadGsapKit";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { signupCta } from "../../utils/site";
import { CloseStack, STACK_SCATTER } from "../CloseStack";
import { MarketingBand } from "../MarketingBand";
import { closeCard, closeGlass, closePicture, closeText, closeTitle } from "./HomeClose.styles";

const TITLE_ID = "home-cta-title";

/**
 * The card rises, then the stack's pieces gather into their pile (prototype 10's `closingMoment`),
 * once, by time. Never scrubbed, as prototype 10's was: this is the last band, so a scrubbed run
 * could stop half done at the page's end (MK2). Another picture in the slot rises whole. Only
 * transforms and opacity move, so nothing shifts, and no figure changes.
 */
export function closeMoment({ gsap }: GsapKit, root: HTMLElement): undefined {
  const entry = marketingMs("entry") / 1000;
  const stagger = marketingMs("stagger") / 1000;
  const timeline = gsap.timeline({
    scrollTrigger: { trigger: root, start: "top 88%", once: true },
    defaults: { ease: "calm", duration: entry, clearProps: "transform,opacity" },
  });
  timeline.from(root, { y: 16, opacity: 0 }, 0);
  const stack = root.querySelector<HTMLElement>("[data-close-stack]");
  const pieces = stack?.querySelectorAll("[data-close-piece]");
  if (stack && pieces?.length) {
    // The pieces sit in a scaled layer: prototype 10's screen offsets, in the layer's own pixels.
    const scale = Number.parseFloat(getComputedStyle(stack).getPropertyValue("--stack-scale")) || 1;
    const at = (i: number) => STACK_SCATTER[i] ?? { x: 0, y: 0, rotation: 0 };
    timeline.from(
      pieces,
      {
        x: (i: number) => at(i).x / scale,
        y: (i: number) => at(i).y / scale,
        rotation: (i: number) => at(i).rotation,
        opacity: 0,
        stagger: stagger / 2,
      },
      stagger * 2,
    );
    return;
  }
  const picture = root.querySelector("[data-close-picture]");
  if (picture) timeline.from(picture, { y: 10, opacity: 0 }, stagger * 2);
}

export interface HomeCloseProps {
  /** The close's picture; prototype 10's gathered stack unless a page gives another. */
  picture?: ReactNode;
}

/**
 * The home page's close (ROLLOUT-PLAN M1, from prototype 11): calm, on the canvas band as the
 * prototype's, with no dark band. Prototype 10's gathered stack of the hero's pieces (owner,
 * 28 Nov 2026), the question, one line and the page's last "Request an invite". The shared
 * `ClosingCta` stays as it is for the other pages.
 */
export const HomeClose: FC<HomeCloseProps> = ({ picture = <CloseStack /> }) => {
  const cta = signupCta();
  const cardRef = useRef<HTMLDivElement>(null);
  useGsapMoment(cardRef, closeMoment);

  return (
    <MarketingBand
      bubbleFit="beside"
      bubbles="b"
      id="get-started"
      labelledBy={TITLE_ID}
      stop="Get started"
      tone="canvas"
      width="narrow"
    >
      <div ref={cardRef}>
        <Card className={closeGlass} material="glass" padding="none" radius="showcase">
          <div className={closeCard} data-testid="home-final-cta">
            <div
              className={closePicture}
              data-close-picture=""
              data-testid="home-final-cta-picture"
            >
              {picture}
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
    </MarketingBand>
  );
};
