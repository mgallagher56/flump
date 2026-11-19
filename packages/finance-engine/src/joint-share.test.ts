import { describe, expect, it } from "vitest";
import { findAdviceHits } from "./compliance/advice-lexicon.js";
import {
  applyAccountShare,
  canAccountBeJoint,
  DEFAULT_JOINT_SHARE_PERCENT,
  DEFAULT_SOLE_SHARE_PERCENT,
  describeJointLiabilityNotice,
  isIsaAccount,
  isPensionAccount,
  JOINT_LIABILITY_NOTICE,
  resolveAccountOwnership,
  resolveAccountSharePercent,
  splitJointSavingsInterest,
} from "./joint-share.js";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import { PortfolioSnapshot } from "./portfolio.js";
import { selectNetWorthSeries } from "./snapshots.js";

describe("E34 Slice 1: joint account & mortgage share helpers", () => {
  describe("canAccountBeJoint / ISA & pension exclusions (E34 Section 2)", () => {
    it.each([
      ["ISA"],
      ["Cash ISA"],
      ["Stocks & Shares ISA"],
      ["Lifetime ISA"],
      ["Junior ISA"],
      ["JISA"],
      ["LISA"],
      ["CASH_ISA"],
      ["STOCKS_ISA"],
    ])("forbids %s from being marked joint", (type) => {
      expect(isIsaAccount(type)).toBe(true);
      expect(canAccountBeJoint(type)).toBe(false);
      expect(canAccountBeJoint({ type })).toBe(false);
      expect(canAccountBeJoint({ type: "", rawType: type })).toBe(false);
    });

    it("forbids Saving or Investment accounts whose name indicates an ISA or LISA", () => {
      expect(isIsaAccount({ name: "Cash ISA", type: "Saving" })).toBe(true);
      expect(canAccountBeJoint({ name: "Cash ISA", type: "Saving", ownership: "joint" })).toBe(
        false,
      );
      expect(
        canAccountBeJoint({ name: "Stocks & Shares ISA", type: "Investment", ownership: "joint" }),
      ).toBe(false);
      expect(canAccountBeJoint({ name: "Moneybox LISA", type: "Saving" })).toBe(false);
      expect(canAccountBeJoint({ name: "Child JISA", type: "Investment" })).toBe(false);
    });

    it("does not false-positive on words containing 'isa' or 'lisa' substrings", () => {
      expect(isIsaAccount({ name: "Crisalis Savings", type: "Saving" })).toBe(false);
      expect(isIsaAccount({ name: "Lisbon Holiday Pot", type: "Saving" })).toBe(false);
      expect(isIsaAccount({ name: "Visa Card", type: "Credit Card" })).toBe(false);
      expect(canAccountBeJoint({ name: "Lisbon Holiday Pot", type: "Saving" })).toBe(true);
    });

    it.each([
      ["Cash ISA", true],
      ["LISA", true],
      ["Stocks and shares ISA", true],
      ["Junior ISA", true],
      ["Lifetime ISA", true],
      ["Moneybox LISA", true],
      ["Lisa joint saver", false],
      ["Joint saver for Lisa", false],
      ["lisa savings", false],
    ])("reads an ISA from the name %s: %s", (name, isa) => {
      expect(isIsaAccount({ name, type: "Saving" })).toBe(isa);
      expect(canAccountBeJoint({ name, type: "Saving", ownership: "joint" })).toBe(!isa);
    });

    it("a joint account named after a person called Lisa counts at its share", () => {
      const account = { name: "Lisa joint saver", type: "Saving", ownership: "joint" };
      expect(resolveAccountOwnership(account)).toBe("joint");
      expect(resolveAccountSharePercent(account)).toBe(50);
    });

    it("forbids any account flagged with isIsa: true from being joint", () => {
      expect(isIsaAccount({ type: "Saving", isIsa: true })).toBe(true);
      expect(canAccountBeJoint({ type: "Saving", isIsa: true })).toBe(false);
      expect(canAccountBeJoint({ type: "Investment", isIsa: true })).toBe(false);
    });

    it.each([
      ["Pension"],
      ["SIPP"],
      ["Workplace Pension"],
      ["Personal Pension"],
      ["PENSION_WORKPLACE"],
      ["PENSION_SIPP"],
    ])("forbids %s from being marked joint", (type) => {
      expect(isPensionAccount(type)).toBe(true);
      expect(canAccountBeJoint(type)).toBe(false);
      expect(canAccountBeJoint({ type })).toBe(false);
    });

    it.each([
      ["Current"],
      ["CURRENT"],
      ["checking"],
      ["Saving"],
      ["Savings"],
      ["SAVINGS"],
      ["Investment"],
      ["GENERAL_INVESTMENT"],
      ["GIA"],
      ["Mortgage"],
      ["MORTGAGE_RESIDENTIAL"],
      ["MORTGAGE_BTL"],
      ["Loan"],
      ["LOAN_PERSONAL"],
      ["Credit Card"],
      ["CREDIT_CARD"],
      ["credit_card"],
      ["Overdraft"],
      ["OVERDRAFT"],
      ["CAR_FINANCE_PCP_HP"],
      ["Property"],
    ])("allows %s to be marked joint", (type) => {
      expect(canAccountBeJoint(type)).toBe(true);
      expect(canAccountBeJoint({ type })).toBe(true);
    });
  });

  describe("resolveAccountOwnership & resolveAccountSharePercent", () => {
    it("defaults to sole (100%) when input or ownership is omitted", () => {
      expect(resolveAccountOwnership()).toBe("sole");
      expect(resolveAccountOwnership(null)).toBe("sole");
      expect(resolveAccountOwnership({ type: "Mortgage" })).toBe("sole");
      expect(resolveAccountSharePercent()).toBe(DEFAULT_SOLE_SHARE_PERCENT);
      expect(resolveAccountSharePercent({ type: "Mortgage", ownership: "sole" })).toBe(100);
      expect(
        resolveAccountSharePercent({ type: "Mortgage", ownership: "sole", sharePercent: 50 }),
      ).toBe(100);
    });

    it("forces 100% sole share on ISAs and pensions even if marked joint", () => {
      for (const type of [
        "ISA",
        "Cash ISA",
        "CASH_ISA",
        "Stocks & Shares ISA",
        "STOCKS_ISA",
        "Lifetime ISA",
        "Pension",
        "SIPP",
        "Workplace Pension",
        "PENSION_WORKPLACE",
        "PENSION_SIPP",
      ]) {
        expect(resolveAccountOwnership({ type, ownership: "joint", sharePercent: 50 })).toBe(
          "sole",
        );
        expect(resolveAccountSharePercent({ type, ownership: "joint", sharePercent: 25 })).toBe(
          100,
        );
      }

      expect(
        resolveAccountSharePercent({
          name: "Cash ISA",
          type: "Saving",
          ownership: "joint",
          sharePercent: 50,
        }),
      ).toBe(100);

      expect(
        resolveAccountSharePercent({
          type: "Saving",
          isIsa: true,
          ownership: "joint",
          sharePercent: 50,
        }),
      ).toBe(100);
    });

    it("defaults to 50% when an eligible account is marked joint without a share", () => {
      expect(resolveAccountOwnership({ type: "Mortgage", ownership: "joint" })).toBe("joint");
      expect(resolveAccountSharePercent({ type: "Mortgage", ownership: "joint" })).toBe(
        DEFAULT_JOINT_SHARE_PERCENT,
      );
      expect(
        resolveAccountSharePercent({ type: "Saving", ownership: "joint", sharePercent: null }),
      ).toBe(50);
    });

    it("returns the custom sharePercent when 0 < sharePercent <= 100", () => {
      expect(
        resolveAccountSharePercent({ type: "Mortgage", ownership: "joint", sharePercent: 60 }),
      ).toBe(60);
      expect(
        resolveAccountSharePercent({ type: "Property", ownership: "joint", sharePercent: 33.33 }),
      ).toBe(33.33);
      expect(
        resolveAccountSharePercent({ type: "Current", ownership: "joint", sharePercent: "75" }),
      ).toBe(75);
      expect(resolveAccountSharePercent({ type: "Loan", ownership: "joint", sharePct: 40 })).toBe(
        40,
      );
      expect(resolveAccountSharePercent({ type: "Loan", ownership: "joint", share_pct: 25 })).toBe(
        25,
      );
    });

    it("validates out-of-range or non-finite sharePercent values", () => {
      expect(
        resolveAccountSharePercent({ type: "Mortgage", ownership: "joint", sharePercent: 0 }),
      ).toBe(0);
      expect(
        resolveAccountSharePercent({ type: "Mortgage", ownership: "joint", sharePercent: -20 }),
      ).toBe(50);
      expect(
        resolveAccountSharePercent({
          type: "Mortgage",
          ownership: "joint",
          sharePercent: Number.NaN,
        }),
      ).toBe(50);
      expect(
        resolveAccountSharePercent({ type: "Mortgage", ownership: "joint", sharePercent: 140 }),
      ).toBe(100);
    });
  });

  describe("a 0% joint share", () => {
    it("counts none of the balance, payment or interest rather than half", () => {
      const joint0 = { type: "Saving", ownership: "joint", sharePercent: 0 } as const;
      expect(applyAccountShare(280_000, { ...joint0, type: "Mortgage" })).toBe(0);
      expect(applyAccountShare(-1_200, { ...joint0, type: "Current" })).toBe(0);
      expect(splitJointSavingsInterest(400, joint0)).toBe(0);
      expect(resolveAccountSharePercent({ ...joint0, sharePercent: "0" })).toBe(0);
    });
  });

  describe("applyAccountShare", () => {
    it("scales balances and monthly payments for joint accounts", () => {
      expect(applyAccountShare(280_000, { type: "Mortgage", ownership: "joint" })).toBe(140_000);
      expect(
        applyAccountShare(1_450, { type: "Mortgage", ownership: "joint", sharePercent: 60 }),
      ).toBe(870);
      expect(
        applyAccountShare(100, { type: "Saving", ownership: "joint", sharePercent: 33.33 }),
      ).toBe(33.33);
    });

    it("rounds half-pennies symmetrically for positive and negative amounts", () => {
      expect(applyAccountShare(20.01, { type: "Current", ownership: "joint" })).toBe(10.01);
      expect(applyAccountShare(-20.01, { type: "Current", ownership: "joint" })).toBe(-10.01);
      expect(
        applyAccountShare(1.005, { type: "Saving", ownership: "joint", sharePercent: 100 }),
      ).toBe(1.005);
      expect(
        applyAccountShare(2.01, { type: "Saving", ownership: "joint", sharePercent: 50 }),
      ).toBe(1.01);
    });

    it("keeps 100% of sole accounts and individual-only accounts (ISAs and pensions)", () => {
      expect(applyAccountShare(280_000, { type: "Mortgage", ownership: "sole" })).toBe(280_000);
      expect(
        applyAccountShare(20_000, {
          name: "Stocks & Shares ISA",
          type: "Investment",
          ownership: "joint",
          sharePercent: 50,
        }),
      ).toBe(20_000);
      expect(
        applyAccountShare(85_000, {
          type: "PENSION_WORKPLACE",
          ownership: "joint",
          sharePercent: 50,
        }),
      ).toBe(85_000);
    });

    it("handles negative (overdrawn) balances and zero/non-finite numbers", () => {
      expect(applyAccountShare(-800, { type: "Current", ownership: "joint" })).toBe(-400);
      expect(applyAccountShare(0, { type: "Current", ownership: "joint" })).toBe(0);
      expect(applyAccountShare(Number.NaN, { type: "Current", ownership: "joint" })).toBe(0);
    });
  });

  describe("splitJointSavingsInterest", () => {
    it("splits joint savings interest 50/50 by default for Personal Savings Allowance", () => {
      expect(splitJointSavingsInterest(1_200, { type: "Saving", ownership: "joint" })).toBe(600);
      expect(splitJointSavingsInterest(1_200, { ownership: "joint" })).toBe(600);
    });

    it("allows overriding the joint savings interest split", () => {
      expect(
        splitJointSavingsInterest(1_200, {
          type: "Savings",
          ownership: "joint",
          sharePercent: 75,
        }),
      ).toBe(900);
    });

    it("counts 100% of sole savings interest", () => {
      expect(splitJointSavingsInterest(1_200, { type: "Saving", ownership: "sole" })).toBe(1_200);
      expect(splitJointSavingsInterest(1_200)).toBe(1_200);
    });

    it("returns 0 taxable interest for ISAs (by type or name) and pensions", () => {
      expect(splitJointSavingsInterest(1_200, { type: "Cash ISA", ownership: "sole" })).toBe(0);
      expect(
        splitJointSavingsInterest(1_200, {
          name: "Cash ISA",
          type: "Saving",
          ownership: "joint",
        }),
      ).toBe(0);
      expect(
        splitJointSavingsInterest(1_200, { type: "Saving", isIsa: true, ownership: "joint" }),
      ).toBe(0);
      expect(splitJointSavingsInterest(1_200, { type: "SIPP", ownership: "sole" })).toBe(0);
    });

    it("returns 0 for zero, negative or non-finite interest amounts", () => {
      expect(splitJointSavingsInterest(0, { type: "Saving", ownership: "joint" })).toBe(0);
      expect(splitJointSavingsInterest(-50, { type: "Saving", ownership: "joint" })).toBe(0);
      expect(splitJointSavingsInterest(Number.NaN, { type: "Saving", ownership: "joint" })).toBe(0);
    });
  });

  describe("describeJointLiabilityNotice", () => {
    it.each([
      ["Mortgage"],
      ["MORTGAGE_RESIDENTIAL"],
      ["MORTGAGE_BTL"],
      ["Loan"],
      ["LOAN_PERSONAL"],
      ["Credit Card"],
      ["CREDIT_CARD"],
      ["credit_card"],
      ["Overdraft"],
      ["OVERDRAFT"],
      ["Personal Loan"],
      ["car_finance"],
      ["CAR_FINANCE_PCP_HP"],
    ])("returns the factual UK joint liability notice when %s is marked joint", (type) => {
      expect(describeJointLiabilityNotice({ type, ownership: "joint" })).toBe(
        JOINT_LIABILITY_NOTICE,
      );
      expect(describeJointLiabilityNotice({ type: "", rawType: type, ownership: "joint" })).toBe(
        JOINT_LIABILITY_NOTICE,
      );
    });

    it("returns null for sole debts/mortgages and for joint asset accounts", () => {
      expect(describeJointLiabilityNotice({ type: "Mortgage", ownership: "sole" })).toBeNull();
      expect(describeJointLiabilityNotice({ type: "Loan" })).toBeNull();
      expect(describeJointLiabilityNotice({ type: "Current", ownership: "joint" })).toBeNull();
      expect(describeJointLiabilityNotice({ type: "Saving", ownership: "joint" })).toBeNull();
      expect(describeJointLiabilityNotice({ type: "Property", ownership: "joint" })).toBeNull();
      expect(describeJointLiabilityNotice({ type: "Investment", ownership: "joint" })).toBeNull();
      expect(describeJointLiabilityNotice({ type: "Cash ISA", ownership: "joint" })).toBeNull();
      expect(describeJointLiabilityNotice({ type: "Student Loan", ownership: "joint" })).toBeNull();
      expect(describeJointLiabilityNotice({ type: "STUDENT_LOAN", ownership: "joint" })).toBeNull();
      expect(describeJointLiabilityNotice(null)).toBeNull();
    });

    it("keeps the joint liability notice strictly neutral with zero advice-lexicon hits", () => {
      expect(findAdviceHits(JOINT_LIABILITY_NOTICE)).toEqual([]);
    });
  });

  describe("PortfolioSnapshot joint-share integration (E34 Slice 2)", () => {
    it("scales joint mortgage, property, savings and history by sharePercent while keeping ISAs and pensions at 100%", () => {
      const accounts = [
        {
          id: "home",
          name: "Home",
          type: "Property",
          balance: 400_000,
          ownership: "joint",
          sharePercent: 50,
        },
        {
          id: "mort",
          name: "Joint Mortgage",
          type: "Mortgage",
          balance: -280_000,
          ownership: "joint",
          sharePercent: 50,
          monthlyContribution: 1_500,
        },
        {
          id: "isa",
          name: "Stocks & Shares ISA",
          type: "Investment",
          balance: 30_000,
          ownership: "joint",
          sharePercent: 50,
        },
        {
          id: "pen",
          name: "Workplace Pension",
          type: "Pension",
          balance: 50_000,
          ownership: "joint",
          sharePercent: 50,
        },
      ];
      const details = [
        { accountId: "home", year: 2026, month: 10, value: 390_000 },
        { accountId: "mort", year: 2026, month: 10, value: -282_000 },
      ];
      const snap = new PortfolioSnapshot(accounts, details);

      expect(snap.getTotalProperty()).toBe(200_000);
      expect(snap.getTotalMortgageBalance()).toBe(140_000);
      expect(snap.getTotalInvestments()).toBe(30_000);
      expect(snap.getTotalPensions()).toBe(50_000);
      expect(snap.getAccount("mort")?.monthlyContribution).toBe(750);
      expect(snap.getTotalNetWorth(DEFAULT_NET_WORTH_BASIS)).toBe(
        200_000 + 30_000 + 50_000 - 140_000,
      );
      // Series: home 390,000 x 50% = 195,000; mortgage 282,000 x 50% = 141,000 owed.
      const series = selectNetWorthSeries(accounts, details, DEFAULT_NET_WORTH_BASIS);
      expect(series).toHaveLength(1);
      expect(series[0]).toMatchObject({
        month: "2026-10",
        totalAssets: 195_000,
        totalLiabilities: 141_000,
        netWorth: 54_000,
      });
    });
  });
});

describe("ISA rule by the chosen subtype", () => {
  it("treats an ISA subtype as individual-only, whatever the name says", () => {
    const cashIsa = { type: "Saving", name: "Rainy day pot", accountSubtype: "cash_isa" };
    expect(isIsaAccount(cashIsa)).toBe(true);
    expect(canAccountBeJoint(cashIsa)).toBe(false);
    expect(resolveAccountOwnership({ ...cashIsa, ownership: "joint" })).toBe("sole");
    // 1,000 held in a Cash ISA marked joint at 50% still counts in full: 1,000.
    expect(applyAccountShare(1000, { ...cashIsa, ownership: "joint", sharePercent: 50 })).toBe(
      1000,
    );
    expect(isIsaAccount({ type: "Investment", accountSubtype: "stocks_and_shares_isa" })).toBe(
      true,
    );
    expect(isIsaAccount({ type: "Saving", accountSubtype: "lifetime_isa" })).toBe(true);
  });

  it("lets a non-ISA subtype be joint even when the name mentions an ISA", () => {
    const savings = { type: "Saving", name: "Old ISA transfer pot", accountSubtype: "easy_access" };
    expect(isIsaAccount(savings)).toBe(false);
    expect(canAccountBeJoint(savings)).toBe(true);
    // 1,000 joint at 50%: 1,000 x 50 / 100 = 500.
    expect(applyAccountShare(1000, { ...savings, ownership: "joint", sharePercent: 50 })).toBe(500);
  });

  it("falls back to the name when no subtype was chosen", () => {
    expect(isIsaAccount({ type: "Saving", name: "Cash ISA", accountSubtype: null })).toBe(true);
    expect(isIsaAccount({ type: "Saving", name: "Joint saver", accountSubtype: "" })).toBe(false);
  });
});
