import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { getAnnualRecordEndDate, type TaxRecord } from "../../tax-calculator.js";

const USER_ID = "persona-user";

type TaxRecordSeed = Pick<
  TaxRecord,
  "id" | "type" | "source" | "category" | "name" | "amount" | "date"
> &
  Partial<Pick<TaxRecord, "frequency" | "endDate">>;

/** A tax record row as the backend returns it. Annual records carry the 5 April end date. */
export function taxRecord(seed: TaxRecordSeed): TaxRecord {
  const frequency = seed.frequency ?? "monthly";
  let endDate = seed.endDate ?? null;
  if (frequency === "annual" && endDate === null) endDate = getAnnualRecordEndDate(seed.date);
  return {
    ...seed,
    userId: USER_ID,
    frequency,
    endDate,
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: seed.date,
    updatedAt: seed.date,
  };
}

/** A monthly budget row. */
export function budgetEntry(
  id: string,
  category: string,
  name: string,
  amount: number,
  flags: { isIncome?: boolean; isEssential?: boolean } = {},
): BudgetEntryItem {
  return {
    id,
    category,
    name,
    amount,
    frequency: "monthly",
    isIncome: flags.isIncome ?? false,
    isEssential: flags.isEssential ?? false,
  };
}
