import { roundTo2dp } from "~/utils/roundTo2dp";

/** The optional account fields the add and edit forms post, as the backend takes them. */
export interface AccountFormFields {
  ownership?: "sole" | "joint";
  sharePercent?: number | null;
  accountSubtype?: string | null;
  studentLoanPlan?: string;
  balance?: number;
  creditLimit?: number | null;
  promoZeroPercentUntil?: string | null;
  interestRate?: number | null;
  monthlyContribution?: number | null;
  /** Mortgage only: whole months, 1 to 600. */
  termMonths?: number | null;
  /** Mortgage only (YYYY-MM-DD). */
  fixedRateEndDate?: string | null;
  /** Mortgage only. */
  repaymentType?: "repayment" | "interest-only" | null;
  /** Mortgage only: the Property account it is on. */
  linkedAccountId?: string | null;
}

/** A field left out stays undefined (not sent); an empty field is null (cleared). */
const optionalText = (raw: FormDataEntryValue | null): string | null | undefined =>
  raw === null ? undefined : raw === "" ? null : String(raw);

const optionalMoney = (raw: FormDataEntryValue | null): number | null | undefined => {
  if (raw === null) return undefined;
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? roundTo2dp(value) : undefined;
};

const optionalTermMonths = (raw: FormDataEntryValue | null): number | null | undefined => {
  if (raw === null) return undefined;
  if (raw === "") return null;
  const value = Math.round(Number(raw));
  return Number.isFinite(value) && value >= 1 && value <= 600 ? value : undefined;
};

const optionalRepaymentType = (
  raw: FormDataEntryValue | null,
): "repayment" | "interest-only" | null | undefined => {
  if (raw === null) return undefined;
  if (raw === "") return null;
  return raw === "repayment" || raw === "interest-only" ? raw : undefined;
};

/**
 * Reads the optional account fields from an add or edit form, shared by the accounts list and the
 * account detail routes so both send the same body. Only fields with a value are returned.
 */
export const accountFieldsFromForm = (formData: FormData): AccountFormFields => {
  const rawOwnership = formData.get("ownership");
  const ownership =
    rawOwnership === "joint" ? "joint" : rawOwnership === "sole" ? "sole" : undefined;
  const rawSharePercent = formData.get("sharePercent");
  const sharePercent =
    ownership === "sole"
      ? null
      : rawSharePercent !== null &&
          rawSharePercent !== "" &&
          Number.isFinite(Number(rawSharePercent))
        ? Math.min(100, Math.max(1, Math.round(Number(rawSharePercent))))
        : undefined;
  const rawPlan = formData.get("studentLoanPlan");
  const studentLoanPlan = typeof rawPlan === "string" && rawPlan !== "" ? rawPlan : undefined;
  const fields: AccountFormFields = {
    ownership,
    sharePercent,
    accountSubtype: optionalText(formData.get("accountSubtype")),
    studentLoanPlan,
    // An empty balance is left out (create defaults it, update keeps it), never cleared.
    balance: optionalMoney(formData.get("balance")) ?? undefined,
    creditLimit: optionalMoney(formData.get("creditLimit")),
    promoZeroPercentUntil: optionalText(formData.get("promoZeroPercentUntil")),
    interestRate: optionalMoney(formData.get("interestRate")),
    monthlyContribution: optionalMoney(formData.get("monthlyContribution")),
    termMonths: optionalTermMonths(formData.get("termMonths")),
    fixedRateEndDate: optionalText(formData.get("fixedRateEndDate")),
    repaymentType: optionalRepaymentType(formData.get("repaymentType")),
    linkedAccountId: optionalText(formData.get("linkedAccountId")),
  };
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as AccountFormFields;
};
