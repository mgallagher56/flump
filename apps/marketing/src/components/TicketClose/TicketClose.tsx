import { Button } from "@repo/ui";
import { type FC, type ReactNode, useRef } from "react";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { signupCta } from "../../utils/site";
import { CloseStack } from "../CloseStack";
import { closeMoment } from "../HomeClose";
import { MarketingBand } from "../MarketingBand";
import type { MarketingSectionTone } from "../MarketingSection";
import { SoftCard } from "../SoftCard";
import { closeCard, closePicture, closeText, closeTitle } from "./TicketClose.styles";

export interface TicketCloseProps {
  tone: MarketingSectionTone;
  /** The one line under the question. */
  text?: string;
  /** The question's id, which names the band. */
  titleId?: string;
  /** The close's picture; prototype 10's gathered stack unless a page gives another. */
  picture?: ReactNode;
}

/**
 * The close of the area and AI connection pages: the picture (prototype 10's gathered stack of the
 * home hero's pieces, owner, 28 Nov 2026), the question, one line and "Request an invite" in one
 * card, in production's words. The card rises, then the pieces gather, once, on time.
 */
export const TicketClose: FC<TicketCloseProps> = ({
  tone,
  text = "Start with a few rough figures.",
  titleId = "feature-cta-title",
  picture = <CloseStack />,
}) => {
  const cta = signupCta();
  const ref = useRef<HTMLDivElement>(null);
  useGsapMoment(ref, closeMoment);
  return (
    <MarketingBand bubbles="b" id="get-started" labelledBy={titleId} tone={tone} width="narrow">
      <div ref={ref}>
        <SoftCard
          band={tone === "canvas" ? "canvas" : "card"}
          className={closeCard}
          data-testid="feature-final-cta"
        >
          <div className={closePicture} data-close-picture="">
            {picture}
          </div>
          <h2 className={closeTitle} id={titleId}>
            Ready to see your own figures?
          </h2>
          <p className={closeText}>{text}</p>
          <Button asChild size="lg" variant="primary">
            <a href={cta.href}>{cta.label}</a>
          </Button>
        </SoftCard>
      </div>
    </MarketingBand>
  );
};
