import {
  calculateHicbcPercent,
  calculateIncomeTaxOnTaxable,
  calculateUKTax,
  getTaxYearVerification,
  getUkTaxYearRules,
  MCP_NOTICE,
} from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { type Missing, round2 } from "./common.js";
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
  incomeTaxBands: z.object({
    /** Taxable non-savings income (salary, self-employment and rental profit after the allowance). */
    taxableGbp: z.number(),
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
  }),
  childBenefitCharge: z.object({
    thresholdGbp: z.number(),
    /** Income at which the charge reaches 100% of Child Benefit. */
    fullChargeAtGbp: z.number(),
    /** Whole per cent of any Child Benefit that would be charged at this income. */
    chargePctAtThisIncome: z.number(),
  }),
  section24: z.object({
    financeCostsShareGbp: z.number(),
    /** Basic-rate tax credit on finance costs. */
    taxCreditGbp: z.number(),
    rentalTaxBeforeCreditGbp: z.number(),
    rentalTaxAfterCreditGbp: z.number(),
  }),
  estimate: z.object({
    incomeTaxGbp: z.number(),
    nationalInsuranceGbp: z.number(),
    totalTaxGbp: z.number(),
    /** Income tax on the salary that PAYE is assumed to have taken already. */
    payeTaxGbp: z.number(),
    /** Total tax minus the PAYE tax: the Self Assessment estimate the Tax page shows. */
    selfAssessmentGbp: z.number(),
  }),
  notes: z.array(z.string()),
});

export const getTaxYearPosition = defineFlumpTool({
  name: "get_tax_year_position",
  title: "Tax year position",
  description:
    "The user's UK tax position for a tax year, from their stored salary and tax records: income by source, where total income sits against the Personal Allowance taper (100,000 to 125,140 in recent years), the income tax bands for their region (including Scottish bands), the High Income Child Benefit Charge thresholds, the Section 24 finance-cost credit on rental income, and the estimated tax and Self Assessment figures shown on the Flump Tax page. Facts and estimates only.",
  input: { taxYear: taxYearInput },
  result,
  maxTokens: 3000,
  async handler(input, ctx) {
    const { taxYear, assumptions } = resolveTaxYear(input.taxYear);
    const baseline = await ctx.dataProvider.getBaseline(ctx.token.userId);
    const { records } = await loadTaxYearRecords(ctx, taxYear);
    const salary = Math.max(0, Number(baseline.annualGrossSalary) || 0);
    const share = Number(baseline.propertyOwnershipSharePct);
    // As on the Tax page, a stored 0 is kept (no share of the rent); only a missing value means 100.
    const ownershipShare = Number.isFinite(share) && share >= 0 && share <= 100 ? share : 100;

    // The Tax page's own calculation, so the figures match the app.
    const ledger = calculateUKTax(taxYear, records, salary, ownershipShare);
    const rules = getUkTaxYearRules(taxYear);
    const region: "SCOTLAND" | "ENGLAND_NI_WALES" =
      baseline.ukRegion === "SCOTLAND" ? "SCOTLAND" : "ENGLAND_NI_WALES";
    const regionAssumed = baseline.ukRegionAssumed !== false || !baseline.ukRegion;

    const total = ledger.totalGrossIncome;
    const standard = rules.ewni.personalAllowance;
    const taperStart = rules.ewni.personalAllowanceTaperStart;
    const position: "below_taper" | "in_taper" | "above_taper" =
      total <= taperStart ? "below_taper" : total < rules.taperEnd ? "in_taper" : "above_taper";

    const nonSavings =
      ledger.effectivePayeSalary + ledger.seProfit + ledger.rentalProfitBeforeInterestShare;
    const taxable = Math.max(0, nonSavings - ledger.personalAllowance);
    const bandResult = calculateIncomeTaxOnTaxable(taxable, rules, region);
    const bands = bandResult.bands.map((b) => ({
      name: b.name,
      ratePct: round2(b.rate * 100),
      taxableGbp: round2(b.taxable),
      taxGbp: round2(b.tax),
    }));
    const top = [...bands].reverse().find((b) => b.taxableGbp > 0);

    const { hicbcThresholdStart, hicbcStepWidth } = rules.hicbc;

    const missing: Missing[] = [];
    if (salary === 0 && records.length === 0) {
      missing.push({
        field: "annualSalary",
        why: "No salary is saved in the profile and no tax records fall in this tax year, so every figure is zero.",
        askUser:
          "What is your gross annual salary, and do you have other income such as rent or self-employment?",
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
              "No tax region is saved in the profile, so England, Wales and Northern Ireland rates are used.",
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
          // Net of investment fees, as it enters total income.
          savingsInterestGbp: round2(
            Math.max(0, ledger.savingsInterestGross - ledger.savingsExpenses),
          ),
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
        incomeTaxBands: { taxableGbp: round2(taxable), bands, topBand: top?.name ?? null },
        childBenefitCharge: {
          thresholdGbp: hicbcThresholdStart,
          fullChargeAtGbp: hicbcThresholdStart + 100 * hicbcStepWidth,
          chargePctAtThisIncome: calculateHicbcPercent(total, rules),
        },
        section24: {
          financeCostsShareGbp: round2(ledger.rentalMortgageInterestShare),
          taxCreditGbp: round2(ledger.rentalPropertyTaxCredit),
          rentalTaxBeforeCreditGbp: round2(ledger.rentalPropertyTaxDueBeforeCredit),
          rentalTaxAfterCreditGbp: round2(ledger.rentalPropertyTaxDueAfterCredit),
        },
        estimate: {
          incomeTaxGbp: round2(ledger.totalIncomeTaxDue),
          nationalInsuranceGbp: round2(ledger.totalNIDue),
          totalTaxGbp: round2(ledger.totalTaxDue),
          payeTaxGbp: round2(ledger.payeTaxDue),
          selfAssessmentGbp: round2(ledger.netAdditionalTaxToPay),
        },
        notes: [
          "Estimate from published UK tax rules and the figures saved in Flump. A calculation, not tax advice.",
          "Total income here is salary plus self-employed profit, rental profit share before finance costs, taxable savings interest and dividends; pension contributions and Gift Aid that would lower adjusted net income are not deducted unless recorded.",
          "The Child Benefit charge is worked out on the individual's own income only.",
          ...(region === "SCOTLAND"
            ? [
                "The bands use Scottish rates; the tax and Self Assessment estimate use the Tax page calculation, which applies England, Wales and Northern Ireland rates.",
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
