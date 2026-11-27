import { Button } from "@repo/ui";
import { type FC, useRef } from "react";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { signupCta } from "../../utils/site";
import { GettingStartedTicket } from "../GettingStartedTicket";
import { closeMoment } from "../HomeClose";
import { MarketingBand } from "../MarketingBand";
import type { MarketingSectionTone } from "../MarketingSection";
import { SoftCard } from "../SoftCard";
import { closeCard, closePicture, closeText, closeTitle } from "./TicketClose.styles";

export interface TicketCloseProps {
  tone: MarketingSectionTone;
}

/**
 * The close of the area and AI connection pages (the approved prototypes): the getting started
 * ticket, the question, one line and "Request an invite" in one card, in production's words. The
 * card rises, then the ticket, once, on time.
 */
export const TicketClose: FC<TicketCloseProps> = ({ tone }) => {
  const cta = signupCta();
  const ref = useRef<HTMLDivElement>(null);
  useGsapMoment(ref, closeMoment);
  return (
    <MarketingBand
      bubbles="b"
      id="get-started"
      labelledBy="feature-cta-title"
      tone={tone}
      width="narrow"
    >
      <div ref={ref}>
        <SoftCard
          band={tone === "canvas" ? "canvas" : "card"}
          className={closeCard}
          data-testid="feature-final-cta"
        >
          <div className={closePicture} data-close-picture="">
            <GettingStartedTicket />
          </div>
          <h2 className={closeTitle} id="feature-cta-title">
            Ready to see your own figures?
          </h2>
          <p className={closeText}>Start with a few rough figures.</p>
          <Button asChild size="lg" variant="primary">
            <a href={cta.href}>{cta.label}</a>
          </Button>
        </SoftCard>
      </div>
    </MarketingBand>
  );
};
