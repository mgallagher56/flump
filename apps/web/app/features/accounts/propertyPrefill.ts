import {
  type AccountOwnership,
  BUY_TO_LET_PROPERTY_LABEL,
  HOME_ESTIMATE_LABEL,
  isBuyToLetAccount,
} from "@flump/finance-engine";

export interface MortgageLike {
  id?: string | null;
  type?: string | null;
  name?: string | null;
  accountSubtype?: string | null;
  linkedAccountId?: string | null;
  ownership?: string | null;
  sharePercent?: number | null;
  updatedAt?: string | null;
}

/** What the "add property" dialog starts with: the property's kind, name and suggested share. */
export interface PropertyPrefill {
  name: string;
  subtype: "home" | "rental";
  ownership: AccountOwnership;
  sharePercent: number | null;
  linkMortgage?: { id: string; updatedAt?: string };
}

/**
 * The property "Add an estimate" adds (JO-6): for the one mortgage with no property linked (a
 * residential one first, else a buy-to-let one), a home or a rental with that mortgage's ownership
 * and share as a suggestion (decision 14 B), linked to it once saved. With no such mortgage, or
 * more than one that could be it, a home held solely and linked to nothing.
 */
export const propertyPrefillFor = (accounts: readonly MortgageLike[]): PropertyPrefill => {
  const unlinked = accounts.filter((a) => a.type === "Mortgage" && a.id && !a.linkedAccountId);
  const residential = unlinked.filter((a) => !isBuyToLetAccount(a));
  const candidates = residential.length > 0 ? residential : unlinked;
  const mortgage = candidates.length === 1 ? candidates[0] : undefined;
  if (!mortgage?.id) {
    return { name: HOME_ESTIMATE_LABEL, subtype: "home", ownership: "sole", sharePercent: null };
  }
  const rental = isBuyToLetAccount(mortgage);
  const joint = mortgage.ownership === "joint";
  return {
    name: rental ? BUY_TO_LET_PROPERTY_LABEL : HOME_ESTIMATE_LABEL,
    subtype: rental ? "rental" : "home",
    ownership: joint ? "joint" : "sole",
    sharePercent: joint ? (mortgage.sharePercent ?? null) : null,
    linkMortgage: {
      id: mortgage.id,
      ...(mortgage.updatedAt ? { updatedAt: mortgage.updatedAt } : {}),
    },
  };
};
