import { SectionBand, type SectionBandProps, type SectionBandTone } from "@repo/ui";
import type { FC } from "react";

export type MarketingSectionTone = SectionBandTone;

export interface MarketingSectionProps extends Omit<SectionBandProps, "variant" | "id"> {
  /** Anchor id. The title gets `${id}-title` and labels the section. */
  id: string;
}

/**
 * One marketing band: the design system's `SectionBand` (variant `marketing`), with a required
 * anchor id. Bands are neutral: alternate `canvas` with `sunken`, with cards on `surface.card`.
 */
export const MarketingSection: FC<MarketingSectionProps> = (props) => (
  <SectionBand {...props} variant="marketing" />
);
