import type { IconTileTone } from "@repo/ui";
import type { DashboardWidgetKey } from "~/utils/pageConfig";

/**
 * One colour per home section card (owner request, 19 Nov 2026: "a bit more colour"). Debt,
 * savings and mortgage keep their money-domain colours (E16 P9.3: apricot, sage, teal), so a card
 * matches its page. Pension, Self Assessment, budget and accounts, which were teal or grey and so
 * looked alike, take sky, violet, rose and damson. No status colour is used (gold, series7, is
 * the warning colour, so it is left out): a colour names a
 * section, it never says anything about the figure. The title and icon always name it too.
 */
export type SectionColour = "teal" | "sage" | "apricot" | "sky" | "rose" | "violet" | "damson";

export const SECTION_COLOURS: Record<DashboardWidgetKey, SectionColour> = {
  debt: "apricot",
  mortgage: "teal",
  savings: "sage",
  pension: "sky",
  // The retired retirement section shares the pension colour if it is ever drawn.
  retirement: "sky",
  tax: "violet",
  budget: "rose",
  accounts: "damson",
};

/** The icon tile tone for each colour (damson is the accent tile). */
export const SECTION_TILE_TONE: Record<SectionColour, IconTileTone> = {
  teal: "teal",
  sage: "sage",
  apricot: "apricot",
  sky: "sky",
  rose: "rose",
  violet: "violet",
  damson: "accent",
};
