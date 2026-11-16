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

describe("E34 Slice 1: joint account & mortgage share helpers", () => {
  describe("canAccountBeJoint / ISA & pension exclusions (E34 Section 2)", () => {
    it.each([
      ["ISA"],
      ["Cash ISA"],
      ["Stocks & Shares ISA"],
      ["Lifetime ISA"],
      ["Junior ISA"],
      ["LISA"],
    ])("forbids %s from being marked joint", (type) => {
      expect(isIsaAccount(type)).toBe(true);
      expect(canAccountBeJoint(type)).toBe(false);
      expect(canAccountBeJoint({ type })).toBe(false);
    });

    it("forbids any account flagged with isIsa: true from being joint", () => {
      expect(isIsaAccount({ type: "Saving", isIsa: true })).toBe(true);
      expect(canAccountBeJoint({ type: "Saving", isIsa: true })).toBe(false);
      expect(canAccountBeJoint({ type: "Investment", isIsa: true })).toBe(false);
    });

    it.each([["Pension"], ["SIPP"], ["Workplace Pension"], ["Personal Pension"]])(
      "forbids %s from being marked joint",
      (type) => {
        expect(isPensionAccount(type)).toBe(true);
        expect(canAccountBeJoint(type)).toBe(false);
        expect(canAccountBeJoint({ type })).toBe(false);
      },
    );

    it.each([
      ["Current"],
      ["checking"],
      ["Saving"],
      ["Savings"],
      ["Investment"],
      ["GIA"],
      ["Mortgage"],
      ["Loan"],
      ["Credit Card"],
      ["credit_card"],
      ["Overdraft"],
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
        "Stocks & Shares ISA",
        "Lifetime ISA",
        "Pension",
        "SIPP",
        "Workplace Pension",
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
      ).toBe(50);
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

    it("keeps 100% of sole accounts and individual-only accounts (ISAs and pensions)", () => {
      expect(applyAccountShare(280_000, { type: "Mortgage", ownership: "sole" })).toBe(280_000);
      expect(
        applyAccountShare(20_000, {
          type: "Stocks & Shares ISA",
          ownership: "joint",
          sharePercent: 50,
        }),
      ).toBe(20_000);
      expect(
        applyAccountShare(85_000, {
          type: "Workplace Pension",
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

    it("returns 0 taxable interest for ISAs and pensions", () => {
      expect(splitJointSavingsInterest(1_200, { type: "Cash ISA", ownership: "sole" })).toBe(0);
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
      ["Loan"],
      ["Credit Card"],
      ["credit_card"],
      ["Overdraft"],
      ["Personal Loan"],
      ["car_finance"],
    ])("returns the factual UK joint liability notice when %s is marked joint", (type) => {
      expect(describeJointLiabilityNotice({ type, ownership: "joint" })).toBe(
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
      expect(describeJointLiabilityNotice(null)).toBeNull();
    });

    it("keeps the joint liability notice strictly neutral with zero advice-lexicon hits", () => {
      expect(findAdviceHits(JOINT_LIABILITY_NOTICE)).toEqual([]);
    });
  });
});
