import { cx } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { BubbleField, type BubbleFit, type BubbleLayout } from "../BubbleField";
import { MarketingSection, type MarketingSectionProps } from "../MarketingSection";
import { band, bubbleLayer } from "./MarketingBand.styles";

export interface MarketingBandProps extends MarketingSectionProps {
  /** A bubble field behind the content, in one of the three layouts. */
  bubbles?: BubbleLayout;
  bubbleFit?: BubbleFit;
  /**
   * The band's short name as a stop for the page's section control (`HomeStopControl`), such as
   * "Rough figures". Marks the section with `data-home-section`; its heading labels it.
   */
  stop?: string;
  /** Where the stop becomes current, as a share of the screen under the header (default a third). */
  stopLine?: number;
}

/**
 * One marketing band (prototype 11's `Band`): a `MarketingSection` in its tone, positioned and
 * isolated, with an optional bubble field behind its content and an optional mark as a stop for the
 * section control. Bands alternate `card` and `canvas` (UX-GUIDELINES 12.2).
 */
export const MarketingBand: FC<MarketingBandProps> = ({
  bubbles,
  bubbleFit,
  stop,
  stopLine,
  className,
  children,
  ...section
}) => (
  <MarketingSection
    {...section}
    className={cx(band, className)}
    data-home-section={stop === undefined ? undefined : ""}
    data-home-section-line={stopLine === undefined ? undefined : String(stopLine)}
    data-home-section-name={stop}
  >
    {bubbles && (
      <div className={bubbleLayer}>
        <BubbleField fit={bubbleFit} layout={bubbles} />
      </div>
    )}
    {children}
  </MarketingSection>
);
