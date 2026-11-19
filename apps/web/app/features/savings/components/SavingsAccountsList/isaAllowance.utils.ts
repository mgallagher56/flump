/**
 * The ISA allowance estimate lives in the engine (SD-3, audit slice 3), so the Savings page and
 * the financial picture give one answer. No logic is left here.
 */
export {
  estimateIsaUsed,
  isAdultIsaAccount as isIsaAccount,
  monthsIntoTaxYear,
} from "@flump/finance-engine";
