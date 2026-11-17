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
  };
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as AccountFormFields;
};
