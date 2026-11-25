import { describe, expect, it } from "vitest";
import {
  arePensionInheritanceRulesInForce,
  UK_PENSION_INHERITANCE_RULES,
  UK_SELF_EMPLOYED_PENSION_RULES,
  type UkPensionInheritanceRules,
} from "./uk-pension-death-rules.js";
import { reliefAtSourceGross } from "./uk-tax-year.js";

const GOV_URL = /^https:\/\/www\.(gov\.uk|legislation\.gov\.uk)\//;

describe("UK_PENSION_INHERITANCE_RULES (E33 S7)", () => {
  it("holds the figures the decider read on 2026-11-25", () => {
    // Finance Act 2026 ss.66 to 71 (Royal Assent 18 March 2026), deaths on or after 6 April 2027.
    const r = UK_PENSION_INHERITANCE_RULES;
    expect(r.status).toBe("enacted");
    expect(r.appliesToDeathsFrom).toBe("2027-04-06");
    // GOV.UK inheritance-tax: 40% above the thresholds; NRB 325,000, RNRB 175,000, taper from 2m.
    expect(r.rate).toBe(0.4);
    expect(r.nilRateBandGbp).toBe(325000);
    expect(r.residenceNilRateBandGbp).toBe(175000);
    expect(r.residenceTaperThresholdGbp).toBe(2000000);
    expect(r.residenceTaperDivisor).toBe(2);
    // FA 2026 s.72: frozen to the end of 2030-31.
    expect(r.thresholdsFixedUntil).toBe("2031-04-05");
    expect(r.paymentDueMonthAfterDeath).toBe(6);
    expect(r.incomeTaxFreeBeforeAge).toBe(75);
    expect(r.lumpSumAndDeathBenefitAllowanceGbp).toBe(1073100);
    expect(r.enactedBy).toBe("Finance Act 2026, sections 66 to 71");
    expect(r.checkedOn).toBe("2026-11-25");
    expect(r.checkedBy).toBe("fable-decider");
    expect(r.sources).toEqual({
      act: "https://www.legislation.gov.uk/ukpga/2026/11",
      inheritanceTax: "https://www.gov.uk/inheritance-tax",
      inheritedPensionTax: "https://www.gov.uk/tax-on-pension-death-benefits",
      technicalNote:
        "https://www.gov.uk/government/publications/inheritance-tax-on-pensions-technical-note/technical-note-inheritance-tax-on-pensions",
    });
    for (const url of Object.values(r.sources)) expect(url).toMatch(GOV_URL);
  });

  it("is in force from 6 April 2027, not the day before", () => {
    expect(arePensionInheritanceRulesInForce("2027-04-05")).toBe(false);
    expect(arePensionInheritanceRulesInForce("2027-04-06")).toBe(true);
    expect(arePensionInheritanceRulesInForce("2026-11-25")).toBe(false);
    expect(arePensionInheritanceRulesInForce("2031-01-01")).toBe(true);
  });

  it("follows a changed start date", () => {
    const later: UkPensionInheritanceRules = {
      ...UK_PENSION_INHERITANCE_RULES,
      appliesToDeathsFrom: "2028-04-06",
    };
    expect(arePensionInheritanceRulesInForce("2027-04-06", later)).toBe(false);
    expect(arePensionInheritanceRulesInForce("2028-04-06", later)).toBe(true);
  });
});

describe("UK_SELF_EMPLOYED_PENSION_RULES (E33 S7)", () => {
  it("holds the 2026/27 figures the decider read", () => {
    const r = UK_SELF_EMPLOYED_PENSION_RULES;
    expect(r.taxYear).toBe("2026/27");
    // FA 2004 s.190, PTM044100: the basic amount.
    expect(r.basicAmountGbp).toBe(3600);
    // GOV.UK self-employed-national-insurance-rates.
    expect(r.class2SmallProfitsThresholdGbp).toBe(7105);
    expect(r.class2VoluntaryWeeklyGbp).toBe(3.65);
    expect(r.checkedOn).toBe("2026-11-25");
    expect(r.checkedBy).toBe("fable-decider");
    expect(r.sources).toEqual({
      taxRelief: "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      nationalInsurance: "https://www.gov.uk/self-employed-national-insurance-rates",
    });
    for (const url of Object.values(r.sources)) expect(url).toMatch(GOV_URL);
  });
});

describe("reliefAtSourceGross", () => {
  it("grosses a payment up at the 20% basic rate", () => {
    // 80 / 0.8 = 100; 1 / 0.8 = 1.25; 33.33 / 0.8 = 41.6625, to pence 41.66.
    expect(reliefAtSourceGross(80, "2026/27")).toBe(100);
    expect(reliefAtSourceGross(1, "2026/27")).toBe(1.25);
    expect(reliefAtSourceGross(33.33, "2026/27")).toBe(41.66);
  });

  it("never goes below 0", () => {
    expect(reliefAtSourceGross(-50, "2026/27")).toBe(0);
    expect(reliefAtSourceGross(0, "2026/27")).toBe(0);
  });
});
