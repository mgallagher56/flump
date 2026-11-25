import {
  MTD_INCOME_TAX_GOV_UK_LINKS,
  type MtdIncomeTaxPosition,
  mtdIncomeTaxPosition,
  type RentalShareAccount,
  rentalSharesFromAccounts,
  type TaxRecordFields,
} from "@flump/finance-engine";
import { formatMoney } from "@repo/ui";

/**
 * The Making Tax Digital for Income Tax notice (E28 slice A3). The figures and dates come from the
 * engine (`mtd-income-tax.ts`); this file holds only the approved words. It says what the rules
 * are, what the user recorded and where to check, never that someone is or is not mandated.
 */

export interface MtdNoticeLink {
  label: string;
  href: string;
}

export interface MtdNoticeCopy {
  kind: "over" | "general";
  sentences: readonly string[];
  links: readonly MtdNoticeLink[];
}

export const MTD_NOTICE_DISMISS_LABEL = "Hide this notice";

const CHECK_LINK: MtdNoticeLink = {
  label: "Check if you need to use it on GOV.UK",
  href: MTD_INCOME_TAX_GOV_UK_LINKS.check,
};
const SIGN_UP_LINK: MtdNoticeLink = {
  label: "Sign up on GOV.UK",
  href: MTD_INCOME_TAX_GOV_UK_LINKS.signUp,
};

/** "2026-04-06" to "6 April 2026". Every MTD start date is 6 April. */
const startDateInWords = (iso: string): string => `6 April ${iso.slice(0, 4)}`;

/** "2025/26" to "2025 to 2026". */
const taxYearInWords = (taxYear: string): string => {
  const start = Number.parseInt(taxYear, 10);
  return `${start} to ${start + 1}`;
};

export function mtdNoticeCopy(position: MtdIncomeTaxPosition): MtdNoticeCopy | null {
  if (position.kind === "none") return null;
  if (position.kind === "unknown") {
    return {
      kind: "general",
      sentences: [
        "Making Tax Digital for Income Tax asks some self-employed people and landlords to keep digital records and send quarterly updates through software.",
        "Flump does not send anything to HMRC.",
      ],
      links: [CHECK_LINK],
    };
  }
  const { threshold } = position.check;
  const figure = formatMoney(threshold.thresholdGbp).text;
  return {
    kind: "over",
    sentences: [
      "Making Tax Digital for Income Tax is a set of HMRC rules for keeping records and reporting self-employed and property income through software.",
      `From ${startDateInWords(threshold.startDate)}, HMRC expects people over its threshold to keep digital records and send quarterly updates using compatible software.`,
      `The self-employed and property income you recorded for the ${taxYearInWords(threshold.measuredTaxYear)} tax year, before expenses, is over ${figure}, the threshold for that date.`,
      "Flump does not send anything to HMRC and is not compatible software for this.",
    ],
    links: [CHECK_LINK, SIGN_UP_LINK],
  };
}

export interface MtdNoticeInputs {
  records: readonly TaxRecordFields[];
  employmentType?: "employed" | "self-employed" | "other" | null;
  accounts: readonly RentalShareAccount[];
  /** Today on the Europe/London clock (YYYY-MM-DD), from the loader so server and browser agree. */
  today: string;
}

/** The engine's position for the loaders, with rental shares read from Accounts. */
export function mtdNoticePosition(inputs: MtdNoticeInputs): MtdIncomeTaxPosition {
  return mtdIncomeTaxPosition({
    records: inputs.records,
    employmentType: inputs.employmentType ?? null,
    asOf: inputs.today,
    rentalShares: rentalSharesFromAccounts(inputs.accounts),
  });
}
