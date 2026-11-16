export const SAVINGS_SUBTYPE_OPTIONS = [
  { value: "easy_access", label: "Easy access savings" },
  { value: "notice", label: "Notice savings" },
  { value: "regular_saver", label: "Regular saver" },
  { value: "fixed_term", label: "Fixed term savings" },
  { value: "general_savings", label: "General savings" },
  { value: "cash_isa", label: "Cash ISA" },
  { value: "lifetime_isa", label: "Lifetime ISA (LISA)" },
] as const;

export const INVESTMENT_SUBTYPE_OPTIONS = [
  { value: "stocks_and_shares_isa", label: "Stocks and Shares ISA" },
  { value: "general_investment", label: "General investment account" },
] as const;

export const MORTGAGE_SUBTYPE_OPTIONS = [
  { value: "residential_mortgage", label: "Residential mortgage" },
  { value: "btl_mortgage", label: "Buy-to-let (BTL) mortgage" },
] as const;

export const ACCOUNT_SUBTYPE_LABEL: Record<string, string> = Object.fromEntries(
  [...SAVINGS_SUBTYPE_OPTIONS, ...INVESTMENT_SUBTYPE_OPTIONS, ...MORTGAGE_SUBTYPE_OPTIONS].map(
    (o) => [o.value, o.label],
  ),
);

export const ISA_SUBTYPES = new Set(["cash_isa", "lifetime_isa", "stocks_and_shares_isa"]);
