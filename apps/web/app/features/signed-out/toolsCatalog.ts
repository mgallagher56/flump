import {
  Building2,
  CreditCard,
  Flame,
  GraduationCap,
  House,
  type LucideIcon,
  Percent,
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

/**
 * Calculators that exist in `routes/tools.$slug.tsx`. Lead order follows what typical visitors
 * need first (debt, then mortgage), matching marketing's CANONICAL_TOOL_SLUGS (E31); every tile
 * is the same size, no tool is featured.
 * Budget, buffer and pension calculators have no signed-out tool yet, so they are not listed.
 */
export const TOOL_TILES: readonly ToolTileData[] = [
  {
    slug: "uk-debt-snowball-vs-avalanche-calculator",
    shortTitle: "Snowball vs avalanche",
    title: "Debt payoff: snowball vs avalanche calculator",
    description:
      "Compare paying the highest rate first with clearing the smallest balance first, across a credit card and a loan.",
    icon: Flame,
  },
  {
    slug: "0-percent-balance-transfer-payoff-calculator",
    shortTitle: "0% balance transfer expiry",
    title: "0% balance transfer promotional expiry calculator",
    description:
      "Work out the monthly payment that clears a card balance before the 0% rate expires.",
    icon: CreditCard,
  },
  {
    slug: "overdraft-cost-and-payoff-calculator",
    shortTitle: "Overdraft cost",
    title: "Overdraft interest cost calculator",
    description:
      "See the annual cost of arranged overdraft interest at standard UK rates of up to 39.9% EAR.",
    icon: Wallet,
  },
  {
    slug: "mortgage-overpay-vs-isa",
    shortTitle: "Mortgage vs ISA",
    title: "Mortgage overpay vs ISA calculator",
    description:
      "Compare the interest saved by overpaying a mortgage with possible growth in a Stocks and Shares ISA.",
    icon: House,
  },
  {
    slug: "uk-student-loan-overpay-or-invest-calculator",
    shortTitle: "Student loan",
    title: "UK student loan: overpay vs invest calculator",
    description:
      "See how a Plan 1, 2, 4 or 5 student loan balance develops with and without voluntary overpayments.",
    icon: GraduationCap,
  },
  {
    slug: "uk-100k-tax-trap-calculator",
    shortTitle: "£100k tax trap",
    title: "£100k–£125k tax trap calculator",
    description:
      "See how the Personal Allowance taper between £100,000 and £125,140 changes the marginal rate, and what a pension contribution would change.",
    icon: Percent,
  },
  {
    slug: "section-24-landlord-calculator",
    shortTitle: "Section 24 landlord",
    title: "Section 24 landlord tax calculator",
    description:
      "Estimate buy-to-let tax under Section 24 rules, including the 20% basic rate finance cost credit.",
    icon: Building2,
  },
];
