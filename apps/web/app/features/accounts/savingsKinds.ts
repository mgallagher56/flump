/**
 * One choice for the kind of a savings or investment account (owner testing, 18 Nov 2026: a
 * separate "Account type" then "Kind of account" read as choosing an ISA and then correcting it).
 * Each kind is named once, grouped as savings, ISAs and investments. Underneath, a kind is still
 * the stored `type` ("Saving" or "Investment") and `accountSubtype` pair, so saved accounts keep
 * their values. The two "Other" kinds keep an account with no subtype valid without guessing one.
 */
import { INVESTMENT_SUBTYPE_OPTIONS, SAVINGS_SUBTYPE_OPTIONS } from "./accountSubtypes";

export type SavingsAccountType = "Saving" | "Investment";

export interface SavingsKind {
  /** The value of the one select: `${type}:${subtype}`, with an empty subtype for "Other". */
  value: string;
  label: string;
  type: SavingsAccountType;
  /** The stored subtype, or "" when the kind is not set. */
  subtype: string;
}

export interface SavingsKindGroup {
  label: string;
  kinds: readonly SavingsKind[];
}

const kind = (type: SavingsAccountType, subtype: string, label: string): SavingsKind => ({
  value: `${type}:${subtype}`,
  label,
  type,
  subtype,
});

const labelOf = (options: ReadonlyArray<{ value: string; label: string }>, value: string) =>
  options.find((o) => o.value === value)?.label ?? value;

const saving = (subtype: string) =>
  kind("Saving", subtype, labelOf(SAVINGS_SUBTYPE_OPTIONS, subtype));
const investment = (subtype: string) =>
  kind("Investment", subtype, labelOf(INVESTMENT_SUBTYPE_OPTIONS, subtype));

export const SAVINGS_KIND_GROUPS: readonly SavingsKindGroup[] = [
  {
    label: "Savings",
    kinds: [
      saving("easy_access"),
      saving("notice"),
      saving("regular_saver"),
      saving("fixed_term"),
      saving("general_savings"),
      kind("Saving", "", "Other savings account"),
    ],
  },
  {
    label: "ISAs",
    kinds: [saving("cash_isa"), saving("lifetime_isa"), investment("stocks_and_shares_isa")],
  },
  {
    label: "Investments",
    kinds: [investment("general_investment"), kind("Investment", "", "Other investment")],
  },
];

const ALL_KINDS = SAVINGS_KIND_GROUPS.flatMap((g) => g.kinds);

/** The kind a select value names, or null for the empty "choose" option or an unknown value. */
export const savingsKindFromValue = (value: string): SavingsKind | null =>
  ALL_KINDS.find((k) => k.value === value) ?? null;

/**
 * The select value for a saved account. A subtype that does not belong to its type, or none,
 * becomes that type's "Other" kind: a subtype is never guessed from the name.
 */
export const savingsKindValueFor = (
  type: string | null | undefined,
  subtype: string | null | undefined,
): string => {
  const accountType: SavingsAccountType = type === "Investment" ? "Investment" : "Saving";
  const match = ALL_KINDS.find((k) => k.type === accountType && k.subtype === (subtype ?? ""));
  return match ? match.value : `${accountType}:`;
};
