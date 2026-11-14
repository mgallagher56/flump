import { ONBOARDING_SEED_STORAGE_KEY } from "@flump/finance-engine";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

      const slider = screen.getByRole("slider", { name: /Extra each month slider/i });
      fireEvent.change(slider, { target: { value: "150" } });
      expect(screen.getAllByDisplayValue("150").length).toBeGreaterThan(0);

      // Adjust card and loan balance
      const card = within(screen.getByRole("group", { name: /Credit card/ }));
      const loan = within(screen.getByRole("group", { name: /Personal loan/ }));
      const cardBalance = card.getByLabelText("Balance (£)");
      fireEvent.change(cardBalance, { target: { value: "4000" } });
      expect(screen.getByDisplayValue("4000")).toBeDefined();

      const cardApr = card.getByLabelText("APR (%)");
      fireEvent.change(cardApr, { target: { value: "29.9" } });

      const cardMin = card.getByLabelText("Min / mo (£)");
      fireEvent.change(cardMin, { target: { value: "120" } });

      const loanBalance = loan.getByLabelText("Balance (£)");
      fireEvent.change(loanBalance, { target: { value: "6000" } });
      expect(screen.getByDisplayValue("6000")).toBeDefined();

      const loanApr = loan.getByLabelText("APR (%)");
      fireEvent.change(loanApr, { target: { value: "7.5" } });

      const loanMin = loan.getByLabelText("Min / mo (£)");
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
        screen.getByRole("heading", { name: /Mortgage overpayment vs Stocks and Shares ISA/i }),
      ).toBeDefined();
      expect(screen.getByText(/ISA returns are not guaranteed/i)).toBeDefined();

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

      expect(screen.getByText(/Arranged overdraft cost calculator/i)).toBeDefined();
      expect(screen.getByText(/Estimated interest a year/i)).toBeDefined();

      const input = screen.getByLabelText("Average overdraft balance used (£)");
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
      expect(screen.getByText(/Estimated Income Tax on rental profit/i)).toBeDefined();

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

      expect(screen.getByText(/UK student loan repayment calculator/i)).toBeDefined();

      const input = screen.getByLabelText("Gross annual salary (£)");
      fireEvent.change(input, { target: { value: "52000" } });
      expect(screen.getByDisplayValue("52000")).toBeDefined();

      const planSelect = screen.getByLabelText("Student loan plan");
      fireEvent.change(planSelect, { target: { value: "plan2" } });

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe("TaxTrapCalculator", () => {
    it("renders the taper calculator from the engine and pre-fills on continue", () => {
      const onSave = vi.fn();
      render(<TaxTrapCalculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(
        screen.getByText(/Pension contributions and the £100,000 Personal Allowance taper/i),
      ).toBeDefined();
      expect(screen.getByText(/Reaches your pension/i)).toBeDefined();

      const slider = screen.getByRole("slider", { name: /Gross pay a year/i });
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
      expect(screen.getByText(/If you pay only the minimum/i)).toBeDefined();

      const input = screen.getByLabelText("Current 0% card balance (£)");
      fireEvent.change(input, { target: { value: "3500" } });
      expect(screen.getByDisplayValue("3500")).toBeDefined();

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe("persistSeed", () => {
    const calculators = [
      ["DebtSnowballCalculator", DebtSnowballCalculator],
      ["MortgageVsIsaCalculator", MortgageVsIsaCalculator],
      ["OverdraftCostCalculator", OverdraftCostCalculator],
      ["Section24Calculator", Section24Calculator],
      ["StudentLoanCalculator", StudentLoanCalculator],
      ["TaxTrapCalculator", TaxTrapCalculator],
      ["ZeroPercentCliffCalculator", ZeroPercentCliffCalculator],
    ] as const;

    const clearSeed = () => {
      localStorage.removeItem(ONBOARDING_SEED_STORAGE_KEY);
    };

    beforeEach(clearSeed);
    afterEach(clearSeed);

    it.each(calculators)(
      "%s leaves the onboarding seed unset when persistSeed is false",
      (_name, Calculator) => {
        const onSave = vi.fn();
        render(
          <Calculator ctaText="Request an invite" onSaveAndContinue={onSave} persistSeed={false} />,
        );
        fireEvent.click(screen.getByRole("button", { name: /Request an invite/i }));
        expect(onSave).toHaveBeenCalled();
        expect(localStorage.getItem(ONBOARDING_SEED_STORAGE_KEY)).toBeNull();
      },
    );

    it.each(calculators)("%s persists the onboarding seed by default", (_name, Calculator) => {
      render(<Calculator ctaText="Save and continue" onSaveAndContinue={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /Save and continue/i }));
      expect(localStorage.getItem(ONBOARDING_SEED_STORAGE_KEY)).not.toBeNull();
    });
  });
});
