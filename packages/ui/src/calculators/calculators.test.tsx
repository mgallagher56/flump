import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DebtSnowballCalculator,
  MortgageVsIsaCalculator,
  OverdraftCostCalculator,
  Section24Calculator,
  StudentLoanCalculator,
  TaxTrapCalculator,
  ZeroPercentCliffCalculator,
} from "./index";

describe("UI Calculators", () => {
  describe("DebtSnowballCalculator", () => {
    it("renders and handles slider adjustments and CTA", () => {
      const onSave = vi.fn();
      render(<DebtSnowballCalculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(screen.getByText(/Debt payoff: snowball vs avalanche calculator/i)).toBeDefined();
      expect(screen.getByText(/Avalanche strategy/i)).toBeDefined();
      expect(screen.getByText(/Snowball strategy/i)).toBeDefined();

      const slider = screen.getByRole("slider", { name: /Monthly overpayment surplus slider/i });
      fireEvent.change(slider, { target: { value: "150" } });
      expect(screen.getAllByDisplayValue("150").length).toBeGreaterThan(0);

      // Adjust card and loan balance
      const cardBalance = screen.getByLabelText("Credit card balance");
      fireEvent.change(cardBalance, { target: { value: "4000" } });
      expect(screen.getByDisplayValue("4000")).toBeDefined();

      const cardApr = screen.getByLabelText("Credit card APR");
      fireEvent.change(cardApr, { target: { value: "29.9" } });

      const cardMin = screen.getByLabelText("Credit card minimum payment");
      fireEvent.change(cardMin, { target: { value: "120" } });

      const loanBalance = screen.getByLabelText("Personal loan balance");
      fireEvent.change(loanBalance, { target: { value: "6000" } });
      expect(screen.getByDisplayValue("6000")).toBeDefined();

      const loanApr = screen.getByLabelText("Personal loan APR");
      fireEvent.change(loanApr, { target: { value: "7.5" } });

      const loanMin = screen.getByLabelText("Personal loan minimum payment");
      fireEvent.change(loanMin, { target: { value: "180" } });

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe("MortgageVsIsaCalculator", () => {
    it("renders and calculates mortgage overpay vs isa investing", () => {
      const onSave = vi.fn();
      render(<MortgageVsIsaCalculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(
        screen.getByText(/Mortgage overpayment vs stocks and shares ISA comparator/i),
      ).toBeDefined();
      expect(screen.getByText(/UK Mortgage & Wealth Engine/i)).toBeDefined();

      const slider = screen.getByLabelText("Mortgage balance slider");
      fireEvent.change(slider, { target: { value: "300000" } });
      expect(screen.getAllByDisplayValue("300000").length).toBeGreaterThan(0);

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe("OverdraftCostCalculator", () => {
    it("renders and calculates overdraft daily interest and fees", () => {
      const onSave = vi.fn();
      render(<OverdraftCostCalculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(screen.getByText(/Overdraft interest cost calculator/i)).toBeDefined();
      expect(screen.getByText(/Annual bank interest cost/i)).toBeDefined();

      const input = screen.getByLabelText("Overdraft Balance");
      fireEvent.change(input, { target: { value: "1500" } });
      expect(screen.getByDisplayValue("1500")).toBeDefined();

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe("Section24Calculator", () => {
    it("renders and models buy-to-let tax relief", () => {
      const onSave = vi.fn();
      render(<Section24Calculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(screen.getByText(/Section 24 buy-to-let mortgage relief calculator/i)).toBeDefined();
      expect(screen.getByText(/HMRC Landlord Tax Rules/i)).toBeDefined();

      const slider = screen.getByLabelText("Gross annual rental income slider");
      fireEvent.change(slider, { target: { value: "25000" } });
      expect(screen.getAllByDisplayValue("25000").length).toBeGreaterThan(0);

      const interestSlider = screen.getByLabelText("Annual mortgage interest paid slider");
      fireEvent.change(interestSlider, { target: { value: "8000" } });
      expect(screen.getAllByDisplayValue("8000").length).toBeGreaterThan(0);

      const expensesSlider = screen.getByLabelText("Other allowable expenses slider");
      fireEvent.change(expensesSlider, { target: { value: "2000" } });

      const expensesInput = document.getElementById("allowable-expenses") as HTMLInputElement;
      if (expensesInput) fireEvent.change(expensesInput, { target: { value: "2500" } });

      const otherIncomeSlider = screen.getByLabelText("Other annual taxable income slider");
      fireEvent.change(otherIncomeSlider, { target: { value: "55000" } });

      const otherIncomeInput = document.getElementById("other-income") as HTMLInputElement;
      if (otherIncomeInput) fireEvent.change(otherIncomeInput, { target: { value: "60000" } });

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe("StudentLoanCalculator", () => {
    it("renders and computes UK student loan write-off vs repayment", () => {
      const onSave = vi.fn();
      render(<StudentLoanCalculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(screen.getByText(/UK Student Loan: Overpay or Invest\?/i)).toBeDefined();

      const input = screen.getByLabelText("Annual Salary");
      fireEvent.change(input, { target: { value: "52000" } });
      expect(screen.getByDisplayValue("52000")).toBeDefined();

      const planSelect = screen.getByLabelText("Student Loan Plan");
      fireEvent.change(planSelect, { target: { value: "plan2" } });

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe("TaxTrapCalculator", () => {
    it("renders and computes £100k-£125k 60% tax trap", () => {
      const onSave = vi.fn();
      render(<TaxTrapCalculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(screen.getByText(/Interactive £100k–£125k Tax Trap Modeller/i)).toBeDefined();
      expect(screen.getByText(/60% Trap Active/i)).toBeDefined();
      expect(screen.getByText(/Tax and NI saved/i)).toBeDefined();

      const slider = screen.getByRole("slider", { name: /Total Gross UK Income/i });
      fireEvent.change(slider, { target: { value: "110000" } });
      expect(screen.getAllByDisplayValue("110000").length).toBeGreaterThan(0);

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe("ZeroPercentCliffCalculator", () => {
    it("renders and computes 0% purchase card expiration cliff", () => {
      const onSave = vi.fn();
      render(<ZeroPercentCliffCalculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(screen.getByText(/0% balance transfer promotional expiry calculator/i)).toBeDefined();
      expect(screen.getByText(/Target monthly payment/i)).toBeDefined();
      expect(screen.getByText(/Revert APR alert/i)).toBeDefined();

      const input = screen.getByLabelText("0% card balance");
      fireEvent.change(input, { target: { value: "3500" } });
      expect(screen.getByDisplayValue("3500")).toBeDefined();

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalled();
    });
  });
});
