import { TOOL_SLUGS, type ToolSlug } from "@repo/ui/tools";
import {
  Building2,
  CreditCard,
  Flame,
  GraduationCap,
  House,
  type LucideIcon,
  Percent,
  TrendingUp,
  Wallet,
} from "lucide-react";

export interface ToolTileData {
  slug: string;
  title: string;
  /** Short label for compact link lists such as the footer. */
  shortTitle: string;
  description: string;
  icon: LucideIcon;
}

const TILES: Record<ToolSlug, Omit<ToolTileData, "slug">> = {
  "uk-debt-snowball-vs-avalanche-calculator": {
    shortTitle: "Snowball vs avalanche",
    title: "Debt payoff: snowball vs avalanche calculator",
    description:
      "Compare paying the highest rate first with clearing the smallest balance first, with the interest and payoff dates for each.",
    icon: Flame,
  },
  "0-percent-balance-transfer-payoff-calculator": {
    shortTitle: "0% balance transfer expiry",
    title: "0% balance transfer promotional expiry calculator",
    description:
      "Work out the monthly payment that clears a card balance before the 0% rate expires.",
    icon: CreditCard,
  },
  "overdraft-cost-and-payoff-calculator": {
    shortTitle: "Overdraft cost",
    title: "Overdraft interest cost calculator",
    description:
      "See the annual cost of arranged overdraft interest at standard UK rates of up to 39.9% EAR.",
    icon: Wallet,
  },
  "mortgage-overpayment-vs-isa-calculator": {
    shortTitle: "Mortgage vs ISA",
    title: "Mortgage overpay vs ISA calculator",
    description:
      "Compare the interest saved by overpaying a mortgage with possible growth in a Stocks and Shares ISA.",
    icon: House,
  },
  "uk-student-loan-overpay-or-invest-calculator": {
    shortTitle: "Student loan",
    title: "UK student loan: overpay vs invest calculator",
    description:
      "See how a Plan 1, 2, 4 or 5 student loan balance develops with and without voluntary overpayments.",
    icon: GraduationCap,
  },
  "uk-pay-rise-take-home-calculator": {
    shortTitle: "Pay rise take-home",
    title: "What you keep from a pay rise",
    description:
      "See how much of the next £1,000 of pay is take-home after Income Tax, National Insurance, student loan and the Child Benefit charge.",
    icon: TrendingUp,
  },
  "uk-100k-tax-trap-calculator": {
    shortTitle: "£100k tax trap",
    title: "£100k–£125k tax trap calculator",
    description:
      "See how the Personal Allowance taper between £100,000 and £125,140 changes the marginal rate, and what a pension contribution would change.",
    icon: Percent,
  },
  "section-24-landlord-tax-calculator": {
    shortTitle: "Section 24 landlord",
    title: "Section 24 landlord tax calculator",
    description:
      "Estimate buy-to-let tax under Section 24 rules, including the 20% basic rate finance cost credit.",
    icon: Building2,
  },
};

/**
 * Calculators served by `routes/tools.$slug.tsx`, in the shared catalogue order from
 * `@repo/ui/tools` (E31, the same list marketing reads): everyday money first, the £100k trap
 * near the end. Every tile is the same size, no tool is featured.
 */
export const TOOL_TILES: readonly ToolTileData[] = TOOL_SLUGS.map((slug) => ({
  slug,
  ...TILES[slug],
}));
