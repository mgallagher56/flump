import { SectionBand, type SectionBandProps, type SectionBandTone } from "@repo/ui";
import type { FC } from "react";

/**
 * The marketing tones (Midnight and Mint, 24 Nov 2026): `card` (off-white) and `canvas` (pale mint)
 * alternate, `hero` is the page's one solid mint band and `contrast` the dark closing band. The
 * older `teal` tint is not used on the marketing site.
 */
export type MarketingSectionTone = Exclude<SectionBandTone, "teal">;

export interface MarketingSectionProps extends Omit<SectionBandProps, "variant" | "id" | "tone"> {
  /** Anchor id. The title gets `${id}-title` and labels the section. */
  id: string;
  tone?: MarketingSectionTone;
}

/**
 * One marketing band: the design system's `SectionBand` (variant `marketing`), with a required
 * anchor id. Bands alternate `card` with `canvas`, with one `hero` band and a `contrast` closing band.
 */
export const MarketingSection: FC<MarketingSectionProps> = (props) => (
  <SectionBand {...props} variant="marketing" />
);
