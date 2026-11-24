import { Button } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { MarketingSection } from "../MarketingSection";
import { closingCtaBody, closingCtaText, closingCtaTitle } from "./ClosingCta.styles";

export interface ClosingCtaProps {
  /** Anchor id of the band. */
  id: string;
  /** Id of the h2, which labels the band. */
  titleId: string;
  title: string;
  text: string;
  cta: { href: string; label: string };
  /** An optional scene above the title. */
  illustration?: ReactNode;
  "data-testid"?: string;
}

/**
 * The dark closing band before the footer (Midnight and Mint, 24 Nov 2026): a centred title, one
 * line and one primary button on `surface.contrast`.
 */
export const ClosingCta: FC<ClosingCtaProps> = ({
  id,
  titleId,
  title,
  text,
  cta,
  illustration,
  "data-testid": testId,
}) => (
  <MarketingSection id={id} labelledBy={titleId} tone="contrast" width="narrow">
    <div className={closingCtaBody()} data-testid={testId}>
      {illustration}
      <h2 className={closingCtaTitle()} id={titleId}>
        {title}
      </h2>
      <p className={closingCtaText()}>{text}</p>
      <Button asChild size="lg" variant="primary">
        <a href={cta.href}>{cta.label}</a>
      </Button>
    </div>
  </MarketingSection>
);
