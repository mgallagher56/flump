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
    it("renders and handles the extra payment, a debt field and the CTA", () => {
      const onSave = vi.fn();
      render(<DebtSnowballCalculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(screen.getByRole("heading", { name: "Debt payoff methods compared" })).toBeDefined();
      expect(screen.getByText(/Total interest, highest rate first/)).toBeDefined();
      expect(screen.getByText(/Total interest, smallest balance first/)).toBeDefined();

      const slider = screen.getByRole("slider", { name: /Extra payment a month range slider/i });
      fireEvent.change(slider, { target: { value: "150" } });
      expect(screen.getByDisplayValue("£150")).toBeDefined();

      const card = within(screen.getByRole("group", { name: "Debt 1: credit card" }));
      const cardBalance = card.getByLabelText("Balance");
      fireEvent.focus(cardBalance);
      fireEvent.change(cardBalance, { target: { value: "4000" } });
      fireEvent.blur(cardBalance);
      expect(screen.getByDisplayValue("4,000")).toBeDefined();

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ totalUnsecuredDebt: 9000 }));
    });
  });

  describe("MortgageVsIsaCalculator", () => {
    it("renders and calculates mortgage overpay vs isa investing", () => {
      const onSave = vi.fn();
      render(<MortgageVsIsaCalculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(screen.getByRole("heading", { name: /Mortgage overpayment or ISA/i })).toBeDefined();
      expect(screen.getByText(/ISA growth is not fixed and can be negative/i)).toBeDefined();

      const slider = screen.getByLabelText("Mortgage balance range slider");
      fireEvent.change(slider, { target: { value: "300000" } });
      expect((slider as HTMLInputElement).value).toBe("300000");

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe("OverdraftCostCalculator", () => {
    it("renders and calculates overdraft daily interest and fees", () => {
      const onSave = vi.fn();
      render(<OverdraftCostCalculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(
        screen.getByRole("heading", { name: /Arranged overdraft cost calculator/i }),
      ).toBeDefined();
      expect(screen.getByText(/Estimated interest a year/i)).toBeDefined();

      const slider = screen.getByLabelText("Average amount overdrawn range slider");
      fireEvent.change(slider, { target: { value: "1500" } });
      expect(screen.getByDisplayValue("£1,500")).toBeDefined();

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe("Section24Calculator", () => {
    it("renders the engine's estimate and pre-fills on continue", () => {
      const onSave = vi.fn();
      render(<Section24Calculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(screen.getByText(/Tax on rental income under Section 24/i)).toBeDefined();
      expect(screen.getAllByText(/Estimated tax on rental income/i).length).toBeGreaterThan(0);

      const slider = screen.getByLabelText("Rental income a year, before costs range slider");
      fireEvent.change(slider, { target: { value: "25000" } });
      expect(screen.getAllByDisplayValue("25000").length).toBeGreaterThan(0);

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

      const input = screen.getByLabelText("Yearly salary before tax range slider");
      fireEvent.change(input, { target: { value: "52000" } });
      expect((input as HTMLInputElement).value).toBe("52000");

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

      expect(screen.getByText(/Pensions and the Personal Allowance/i)).toBeDefined();
      expect(screen.getByText(/Reaches your pension/i)).toBeDefined();

      const slider = screen.getByRole("slider", { name: /Pay before tax a year/i });
      fireEvent.change(slider, { target: { value: "110000" } });
      expect(screen.getAllByDisplayValue("110000").length).toBeGreaterThan(0);

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe("ZeroPercentCliffCalculator", () => {
    it("renders and computes the payment before a 0% deal ends", () => {
      const onSave = vi.fn();
      render(<ZeroPercentCliffCalculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(
        screen.getByRole("heading", { name: "When a 0% balance transfer ends" }),
      ).toBeDefined();
      expect(screen.getByText(/Estimated monthly payment/i)).toBeDefined();
      expect(screen.getByText(/with minimum payments only/i)).toBeDefined();

      const slider = screen.getByLabelText("Balance on the 0% card range slider");
      fireEvent.change(slider, { target: { value: "3500" } });
      expect(screen.getByDisplayValue("£3,500")).toBeDefined();

      const cta = screen.getByRole("button", { name: /Save and continue/i });
      fireEvent.click(cta);
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ totalUnsecuredDebt: 3500 }));
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
