import {
  calculateHicbcPercent,
  calculateIncomeTaxOnTaxable,
  calculateUKTax,
  estimateInputsFor,
  estimateOptionsFor,
  getTaxYearVerification,
  getUkTaxYearRules,
  isLegacySalaryRecord,
  isSelfEmployedType,
  MCP_NOTICE,
  payeSalaryForTax,
  propertyRatesFor,
  scottishRatesRefusal,
  type TaxEstimateMissingFact,
  type UkIncomeRates,
  type UkTaxRegion,
  type UkTaxYearRules,
} from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { type Missing, refusalMissing, round2 } from "./common.js";
import { loadTaxYearRecords, resolveTaxYear, taxYearInput } from "./tax-common.js";

const result = z.object({
  region: z.enum(["ENGLAND_NI_WALES", "SCOTLAND"]),
  regionAssumed: z.boolean(),
  income: z.object({
    payeSalaryGbp: z.number(),
    selfEmployedProfitGbp: z.number(),
    /** The user's share of rental profit before finance costs (Section 24 basis). */
    rentalProfitShareGbp: z.number(),
    savingsInterestGbp: z.number(),
    dividendsGbp: z.number(),
    totalGbp: z.number(),
  }),
  personalAllowance: z.object({
    standardGbp: z.number(),
    effectiveGbp: z.number(),
    reducedByGbp: z.number(),
    taperStartGbp: z.number(),
    taperEndGbp: z.number(),
    /** Where total income sits against the taper: below it, inside it, or past the point it is fully lost. */
    position: z.enum(["below_taper", "in_taper", "above_taper"]),
  }),
  /** null when the year's rates for this person are not published (missing[] says why). */
  incomeTaxBands: z
    .object({
      /** Taxable non-savings income (salary, self-employment and rental profit after the allowance). */
      taxableGbp: z.number(),
      /**
       * Main-rate bands, lowest rate first. From 2027/28 in England, Wales and Northern Ireland,
       * property income follows as "Property basic", "Property higher" and "Property additional"
       * at the property rates, stacked above the other non-savings income.
       */
      bands: z.array(
        z.object({
          name: z.string(),
          ratePct: z.number(),
          taxableGbp: z.number(),
          taxGbp: z.number(),
        }),
      ),
      /** Band holding the last pound of taxable non-savings income, or null when none is taxable. */
      topBand: z.string().nullable(),
    })
    .nullable(),
  childBenefitCharge: z.object({
    thresholdGbp: z.number(),
    /** Income at which the charge reaches 100% of Child Benefit. */
    fullChargeAtGbp: z.number(),
    /** Whole per cent of any Child Benefit that would be charged at this income. */
    chargePctAtThisIncome: z.number(),
  }),
  section24: z.object({
    financeCostsShareGbp: z.number(),
    /** Basic-rate tax credit on finance costs. The three tax figures are null when the year's rates for this person are not published. */
    taxCreditGbp: z.number().nullable(),
    rentalTaxBeforeCreditGbp: z.number().nullable(),
    rentalTaxAfterCreditGbp: z.number().nullable(),
    /** Finance costs not used this year, which carry forward to the next (ITTOIA 2005 s.274AA(4)). */
    financeCostsCarriedForwardGbp: z.number(),
  }),
  /**
   * null when a fact the estimate depends on is not saved (the same rule as the Dashboard and the
   * Tax page); `missing` names it. Never a figure from a stand-in £0.
   */
  estimate: z
    .object({
      incomeTaxGbp: z.number(),
      nationalInsuranceGbp: z.number(),
      totalTaxGbp: z.number(),
      /** Income tax on the salary that PAYE is assumed to have taken already. */
      payeTaxGbp: z.number(),
      /** Total tax minus the PAYE tax: the Self Assessment estimate the Tax page shows. */
      selfAssessmentGbp: z.number(),
    })
    .nullable(),
  notes: z.array(z.string()),
});

/** The property slice, `from` to `to` of taxable income, at the property rates, band by band. */
function propertySliceBands(
  rules: UkTaxYearRules,
  region: UkTaxRegion,
  rates: UkIncomeRates,
  from: number,
  to: number,
) {
  const upTo = calculateIncomeTaxOnTaxable(to, rules, region, { rates }).bands;
  const below = calculateIncomeTaxOnTaxable(from, rules, region, { rates }).bands;
  return upTo.map((b, i) => ({
    name: `Property ${b.name.toLowerCase()}`,
    rate: b.rate,
    taxable: b.taxable - (below[i]?.taxable ?? 0),
    tax: b.tax - (below[i]?.tax ?? 0),
  }));
}

export const getTaxYearPosition = defineFlumpTool({
  name: "get_tax_year_position",
  title: "Tax year position",
  description:
    "The user's UK tax position for a tax year, from their stored salary and tax records: income by source, where total income sits against the Personal Allowance taper (£100,000 to £125,140 in recent years), the Income Tax bands for their region (including Scottish bands; from 2027/28 in England, Wales and Northern Ireland, property income at the property rates above other income), the High Income Child Benefit Charge thresholds, the Section 24 finance-cost credit on rental income, and the tax and Self Assessment estimates shown on the Flump tax page. The estimate is null when a fact it depends on is not saved, and missing names that fact. When the year's rates for the user's region are not published (Scottish rates for 2027/28), the Income Tax bands and the tax figures are null and missing says why. Facts and estimates only.",
  input: { taxYear: taxYearInput },
  result,
  maxTokens: 3000,
  async handler(input, ctx) {
    const { taxYear, assumptions } = resolveTaxYear(input.taxYear);
    const facts = await ctx.dataProvider.getProfileFacts(ctx.token.userId);
    const { records } = await loadTaxYearRecords(ctx, taxYear);
    // The engine's one rule (SA-1): a self-employed person's salary is not PAYE pay.
    const selfEmployed = isSelfEmployedType(facts.employmentType);
    // As on the Self Assessment page: each rental record at its property's or mortgage's share
    // (decision 6), and Scottish rates on non-savings income for a Scottish taxpayer (decision 7).
    const accounts = await ctx.dataProvider.getAccounts(ctx.token.userId);
    const region: "SCOTLAND" | "ENGLAND_NI_WALES" =
      facts.taxRegion === "SCOTLAND" ? "SCOTLAND" : "ENGLAND_NI_WALES";
    const regionAssumed = facts.taxRegion === null;
    // Whether the estimate can be worked out: the one rule every surface uses.
    const inputs = estimateInputsFor({ ...facts, accounts }, records, taxYear);
    const salary =
      inputs.status === "known"
        ? inputs.payeSalary
        : payeSalaryForTax({
            employmentType: facts.employmentType,
            annualSalary: facts.annualSalary,
          });

    const rules = getUkTaxYearRules(taxYear);
    // Refused, never carried forward: a Scottish taxpayer in a year with no Scottish rates gets
    // no bands, tax or estimate. Income and the Personal Allowance do not depend on the region,
    // so they are read from the ledger under the other UK bands; no rate from it is returned.
    const refusal = scottishRatesRefusal(rules, region);
    const options = estimateOptionsFor({ taxRegion: facts.taxRegion, accounts });

    // The Tax page's own calculation, so the figures match the app.
    // A legacy PAYE salary record never stands in for the saved salary (slice 6).
    const ledger = calculateUKTax(
      taxYear,
      records.filter((r) => !isLegacySalaryRecord(r)),
      salary,
      100,
      refusal ? { ...options, region: "ENGLAND_NI_WALES" } : options,
    );

    const total = ledger.totalGrossIncome;
    const standard = rules.ewni.personalAllowance;
    const taperStart = rules.ewni.personalAllowanceTaperStart;
    const position: "below_taper" | "in_taper" | "above_taper" =
      total <= taperStart ? "below_taper" : total < rules.taperEnd ? "in_taper" : "above_taper";

    const nonSavings =
      ledger.effectivePayeSalary + ledger.seProfit + ledger.rentalProfitBeforeInterestShare;
    // The engine sets the allowance where it gives the lowest bill (ITA 2007 s.25(2)), which is
    // not always all against non-savings income, so read its split rather than assume it.
    const taxable = Math.max(0, nonSavings - ledger.allowanceOnNonSavings);
    // From 2027/28 (England, Wales and NI) property income has its own rates and is the top slice
    // of non-savings income (ITA 2007 s.11CA, s.16A), as the ledger charges it: other income at
    // the main rates up to `otherTaxable`, then property at the property rates above it.
    const propertyRates = refusal ? null : propertyRatesFor(rules, region);
    const otherTaxable = propertyRates
      ? Math.min(
          taxable,
          Math.max(0, ledger.effectivePayeSalary + ledger.seProfit - ledger.allowanceOnNonSavings),
        )
      : taxable;
    const bandResult = refusal ? null : calculateIncomeTaxOnTaxable(otherTaxable, rules, region);
    const toBand = (b: { name: string; rate: number; taxable: number; tax: number }) => ({
      name: b.name,
      ratePct: round2(b.rate * 100),
      taxableGbp: round2(b.taxable),
      taxGbp: round2(b.tax),
    });
    const propertyBands = propertyRates
      ? propertySliceBands(rules, region, propertyRates, otherTaxable, taxable)
      : [];
    const bands = [...(bandResult?.bands ?? []), ...propertyBands].map(toBand);
    const top = [...bands].reverse().find((b) => b.taxableGbp > 0);

    const { hicbcThresholdStart, hicbcStepWidth } = rules.hicbc;

    const missing: Missing[] = refusal ? [refusalMissing("taxRates", refusal.notice)] : [];
    const estimateMissing: TaxEstimateMissingFact[] =
      inputs.status === "unknown" ? inputs.missing : [];
    if (salary === 0 && records.length === 0 && !selfEmployed) {
      missing.push({
        field: "annualSalary",
        why: "No salary is saved and no tax records fall in this tax year, so every figure is zero and there is no estimate.",
        askUser:
          "What is your yearly salary before tax, and do you have other income such as rent or self-employment?",
      });
    } else if (estimateMissing.includes("annualSalary")) {
      missing.push({
        field: "annualSalary",
        why: "No salary is saved, so the estimate is not worked out: the salary decides the tax band the other income falls in. The other figures count only the income in the tax records.",
        askUser: "What is your yearly salary before tax?",
      });
    } else if (estimateMissing.includes("selfEmploymentRecords")) {
      missing.push({
        field: "selfEmploymentRecords",
        why: "No self-employed income is recorded for this tax year, so the estimate is not worked out: the trading income decides the tax band the other income falls in.",
        askUser:
          "What was your self-employed income for this tax year, and your business expenses?",
      });
    } else if (estimateMissing.includes("untaxedIncomeRecords")) {
      missing.push({
        field: "untaxedIncomeRecords",
        why: "No income outside PAYE is recorded for this tax year, so there is no Self Assessment estimate.",
        askUser:
          "Do you have income outside PAYE this tax year, such as rent, self-employment or savings interest?",
      });
    } else if (salary === 0 && !selfEmployed) {
      missing.push({
        field: "annualSalary",
        why: "No salary is saved, so the figures count only the income in the tax records.",
        askUser: "What is your yearly salary before tax?",
      });
    }
    missing.push({
      field: "childBenefit",
      why: "Flump does not store whether anyone in the household receives Child Benefit, so only the charge thresholds and percentage are shown.",
      askUser: "Does anyone in your household receive Child Benefit, and for how many children?",
    });

    const regionAssumption = regionAssumed
      ? [
          {
            field: "region",
            value: region,
            source: "default" as const,
            reason:
              "No tax region is saved, so England, Wales and Northern Ireland rates are used.",
          },
        ]
      : [];

    return {
      taxYear,
      result: {
        region,
        regionAssumed,
        income: {
          payeSalaryGbp: round2(ledger.effectivePayeSalary),
          selfEmployedProfitGbp: round2(ledger.seProfit),
          rentalProfitShareGbp: round2(ledger.rentalProfitBeforeInterestShare),
          // The full amount: investment fees are not deducted (ITTOIA 2005 s.370).
          savingsInterestGbp: round2(Math.max(0, ledger.savingsInterestGross)),
          dividendsGbp: round2(ledger.dividendIncomeGross),
          totalGbp: round2(total),
        },
        personalAllowance: {
          standardGbp: standard,
          effectiveGbp: round2(ledger.personalAllowance),
          reducedByGbp: round2(standard - ledger.personalAllowance),
          taperStartGbp: taperStart,
          taperEndGbp: rules.taperEnd,
          position,
        },
        incomeTaxBands: refusal
          ? null
          : { taxableGbp: round2(taxable), bands, topBand: top?.name ?? null },
        childBenefitCharge: {
          thresholdGbp: hicbcThresholdStart,
          fullChargeAtGbp: hicbcThresholdStart + 100 * hicbcStepWidth,
          chargePctAtThisIncome: calculateHicbcPercent(total, rules),
        },
        section24: {
          financeCostsShareGbp: round2(ledger.rentalMortgageInterestShare),
          taxCreditGbp: refusal ? null : round2(ledger.rentalPropertyTaxCredit),
          rentalTaxBeforeCreditGbp: refusal
            ? null
            : round2(ledger.rentalPropertyTaxDueBeforeCredit),
          rentalTaxAfterCreditGbp: refusal ? null : round2(ledger.rentalPropertyTaxDueAfterCredit),
          financeCostsCarriedForwardGbp: round2(ledger.financeCostsCarriedForward),
        },
        estimate:
          inputs.status === "known"
            ? {
                incomeTaxGbp: round2(ledger.totalIncomeTaxDue),
                nationalInsuranceGbp: round2(ledger.totalNIDue),
                totalTaxGbp: round2(ledger.totalTaxDue),
                payeTaxGbp: round2(ledger.payeTaxDue),
                selfAssessmentGbp: round2(ledger.netAdditionalTaxToPay),
              }
            : null,
        notes: [
          "Total income here is salary plus self-employed profit, rental profit share before finance costs, taxable savings interest and dividends. Pension contributions and Gift Aid, which lower adjusted net income, are deducted only if recorded.",
          "The Child Benefit charge is worked out on the individual's own income only.",
          ...(region === "SCOTLAND" && !refusal
            ? [
                "The bands use Scottish rates. The tax and Self Assessment estimates use the tax page calculation, which applies England, Wales and Northern Ireland rates.",
              ]
            : []),
        ],
      },
      provenance: { income: "profile_and_tax_records", estimate: "tax_page_calculation" },
      assumptions: [...assumptions, ...regionAssumption],
      missing,
      verification: getTaxYearVerification(taxYear),
      notice: MCP_NOTICE,
    };
  },
});
