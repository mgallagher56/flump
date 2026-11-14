/** The account categories every total is grouped by. */
export type AccountCategory =
  | "cash"
  | "savings"
  | "investments"
  | "pensions"
  | "debt"
  | "mortgages"
  | "property"
  | "studentLoans"
  | "other";

export function categorizeAccountType(rawType?: string | null): AccountCategory {
  if (!rawType) return "other";
  const t = rawType.trim().toLowerCase();

  if (t === "current" || t === "checking") return "cash";
  if (t === "saving" || t === "savings") return "savings";
  if (t === "investment" || t === "investments" || t === "isa" || t === "gia") return "investments";
  if (t === "pension" || t === "pensions" || t === "sipp") return "pensions";
  if (t === "credit card" || t === "credit_card" || t === "loan" || t === "overdraft") {
    return "debt";
  }
  // "Owed" is money someone owes the user (an IOU): an asset, not cash in hand and never a debt
  // to pay off. Web and mobile have always treated it so; the engine had it as debt (E23).
  if (t === "owed") return "other";
  if (t === "property") return "property";
  if (t === "student loan" || t === "student_loan") return "studentLoans";
  if (t === "mortgage" || t === "mortgages") return "mortgages";

  return "other";
}

export function isLiabilityCategory(category: AccountCategory): boolean {
  return category === "debt" || category === "mortgages";
}
