import type { Meta, StoryObj } from "@storybook/react";
import { useMemo } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { useScenarioState } from "../../hooks/useScenarioState";
import { MortgageScenarioInputs } from "../MortgageScenarioInputs";
import { MortgageSummary } from "../MortgageSummary";
import { MortgageTracker } from "../MortgageTracker";
import { OverpaymentSimulator } from "../OverpaymentSimulator";
import { MortgageScenarioZone } from "./MortgageScenarioZone";

const meta: Meta<typeof MortgageScenarioZone> = {
  title: "3. Financial Patterns & Sections/MortgageScenarioZone",
  component: MortgageScenarioZone,
  parameters: { layout: "padded" },
  args: {
    basis: "Starting from your figures: £180,000 at 4.5%, 20 years left",
    children: "Scenario tools go here.",
    onReset: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MortgageScenarioZone>;

export const Default: Story = {};

export const Modified: Story = {
  args: { isModified: true, announcement: "Interest saved £12,000" },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Reset to saved figures" }),
    );
    await expect(args.onReset).toHaveBeenCalled();
  },
};

const noop = () => undefined;

/** The saved sections above the zone, and the zone seeded from them (used for the PR frames). */
const PageComposition = () => {
  const saved = useMemo(
    () => ({ loanAmount: 180000, interestRate: 4.5, remainingTerm: 20, overpayment: 0 }),
    [],
  );
  const scenario = useScenarioState(saved);
  const values = scenario.values;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <MortgageSummary
        canSaveFigures
        canSaveTerm
        editInterestRate="4.5"
        editLoanAmount={180000}
        editMortgageType="repayment"
        editPayment={1138.79}
        editRemainingTerm="20"
        interestRate={saved.interestRate}
        isEditing={false}
        lastUpdated="Last updated 13 November 2026"
        loanAmount={saved.loanAmount}
        monthlyPayment={1138.79}
        mortgageType="repayment"
        propertyCategory="residential"
        remainingTerm={saved.remainingTerm}
        saveError={null}
        saveMessage={null}
        onAddAccount={noop}
        onCancelEditing={noop}
        onEditInterestRateChange={noop}
        onEditLoanAmountChange={noop}
        onEditMortgageTypeChange={noop}
        onEditRemainingTermChange={noop}
        onSave={noop}
        onStartEditing={noop}
      />
      <MortgageTracker
        interestRate={saved.interestRate}
        loanAmount={saved.loanAmount}
        mortgageAccounts={[]}
        remainingTerm={saved.remainingTerm}
        selectedAccountId={null}
        onSelectAccount={noop}
      />
      <MortgageScenarioZone
        basis="Starting from your figures: £180,000 at 4.5%, 20 years left"
        footer={<span>Update your details</span>}
        isModified={scenario.isModified}
        onReset={scenario.reset}
      >
        <MortgageScenarioInputs
          isEdited={scenario.isEdited}
          values={values}
          onChange={(key, value) => scenario.set(key, value)}
        />
        <OverpaymentSimulator
          interestRate={values.interestRate}
          loanAmount={values.loanAmount}
          overpayment={values.overpayment}
          remainingTerm={values.remainingTerm}
          onOverpaymentChange={(v) => scenario.set("overpayment", v)}
        />
      </MortgageScenarioZone>
    </div>
  );
};

export const OnThePage: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <PageComposition />,
};
