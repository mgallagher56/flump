import { ONBOARDING_SEED_STORAGE_KEY } from "@flump/finance-engine";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DebtSnowballCalculator,
  MarginalRateExplorerStandalone,
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

      const slider = screen.getByRole("slider", { name: /Extra payment a month/i });
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
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ totalUnsecuredDebt: 5500 }));
    });
  });

  describe("MortgageVsIsaCalculator", () => {
    it("renders and calculates mortgage overpay vs isa investing", () => {
      const onSave = vi.fn();
      render(<MortgageVsIsaCalculator ctaText="Save and continue" onSaveAndContinue={onSave} />);

      expect(screen.getByRole("heading", { name: /Mortgage overpayment or ISA/i })).toBeDefined();
      // The caveat shows in the first view, under the ISA figure.
      expect(screen.getAllByText(/ISA growth is not fixed and can be negative/i).length).toBe(1);

      const slider = screen.getByLabelText("Mortgage balance");
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

      const slider = screen.getByLabelText("Average amount overdrawn");
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

      const slider = screen.getByLabelText("Rental income a year, before costs");
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

      const input = screen.getByLabelText("Yearly salary before tax");
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
      expect(screen.getByText(/Estimated reduction in take-home pay/i)).toBeDefined();

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
      expect(screen.getByText(/Left after minimum payments/i)).toBeDefined();

      const slider = screen.getByLabelText("Balance on the 0% card");
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

  describe("sliders feed the estimate", () => {
    const sliders = [
      ["StudentLoanCalculator", StudentLoanCalculator, "Student loan balance", "30000"],
      ["MortgageVsIsaCalculator", MortgageVsIsaCalculator, "Mortgage interest rate", "6.5"],
      ["Section24Calculator", Section24Calculator, "Mortgage interest a year", "9000"],
      [
        "ZeroPercentCliffCalculator",
        ZeroPercentCliffCalculator,
        "Rate after the deal (APR)",
        "29.9",
      ],
    ] as const;

    it.each(sliders)("%s keeps the value moved to on %s", (_name, Calculator, label, value) => {
      render(<Calculator persistSeed={false} />);
      const slider = screen.getByRole("slider", { name: label }) as HTMLInputElement;
      fireEvent.change(slider, { target: { value } });
      expect(slider.value).toBe(value);
    });
  });

  describe("sign-up payload", () => {
    it.each([
      ["DebtSnowballCalculator", DebtSnowballCalculator],
      ["OverdraftCostCalculator", OverdraftCostCalculator],
      ["ZeroPercentCliffCalculator", ZeroPercentCliffCalculator],
    ] as const)(
      "%s asks onboarding for the accounts, debt and budget modules",
      (_n, Calculator) => {
        const onSave = vi.fn();
        render(
          <Calculator ctaText="Save and continue" onSaveAndContinue={onSave} persistSeed={false} />,
        );
        fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "DEBT",
            inferredModules: ["accounts", "debt", "budget"],
          }),
        );
      },
    );

    it("MarginalRateExplorerStandalone asks onboarding for the tax and pension modules", () => {
      const onSave = vi.fn();
      render(
        <MarginalRateExplorerStandalone
          ctaText="Save and continue"
          initialValues={{ grossPay: 52_000 }}
          onSaveAndContinue={onSave}
          persistSeed={false}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ annualIncome: 52_000, inferredModules: ["tax", "pension"] }),
      );
    });

    it("MarginalRateExplorerStandalone writes the onboarding seed by default", () => {
      localStorage.removeItem(ONBOARDING_SEED_STORAGE_KEY);
      render(
        <MarginalRateExplorerStandalone ctaText="Save and continue" onSaveAndContinue={vi.fn()} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
      expect(localStorage.getItem(ONBOARDING_SEED_STORAGE_KEY)).not.toBeNull();
      localStorage.removeItem(ONBOARDING_SEED_STORAGE_KEY);
    });
  });

  describe("sign-up button with no callback", () => {
    const calculators = [
      ["DebtSnowballCalculator", DebtSnowballCalculator],
      ["MortgageVsIsaCalculator", MortgageVsIsaCalculator],
      ["OverdraftCostCalculator", OverdraftCostCalculator],
      ["Section24Calculator", Section24Calculator],
      ["StudentLoanCalculator", StudentLoanCalculator],
      ["TaxTrapCalculator", TaxTrapCalculator],
      ["ZeroPercentCliffCalculator", ZeroPercentCliffCalculator],
      ["MarginalRateExplorerStandalone", MarginalRateExplorerStandalone],
    ] as const;

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it.each(calculators)("%s sends the visitor to the sign-up page", (_name, Calculator) => {
      const location = { href: "http://localhost:3000/tools" } as Location;
      vi.spyOn(window, "location", "get").mockReturnValue(location);
      render(<Calculator ctaText="Request an invite" persistSeed={false} />);
      fireEvent.click(screen.getByRole("button", { name: "Request an invite" }));
      expect(location.href).toBe("/signup");
    });
  });
});
