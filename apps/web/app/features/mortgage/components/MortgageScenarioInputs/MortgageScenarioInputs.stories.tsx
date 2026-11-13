import { ScenarioZone } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { useMemo, useState } from "react";
import { expect, fireEvent, fn, within } from "storybook/test";
import { useScenarioState } from "~/hooks/useScenarioState";
import { MortgageSummary } from "../MortgageSummary";
import { MortgageTracker } from "../MortgageTracker";
import { OverpaymentSimulator } from "../OverpaymentSimulator";
import { MortgageScenarioInputs } from "./MortgageScenarioInputs";

const meta: Meta<typeof MortgageScenarioInputs> = {
  title: "3. Financial Patterns & Sections/MortgageScenarioInputs",
  component: MortgageScenarioInputs,
  parameters: { layout: "padded" },
  args: {
    values: { loanAmount: 180000, interestRate: 4.5, remainingTerm: 20 },
    isEdited: () => false,
    onChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MortgageScenarioInputs>;

export const Saved: Story = {};

export const Edited: Story = {
  args: { isEdited: (key) => key === "interestRate" },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText("Changed from your saved figure").length,
    ).toBeGreaterThan(0);
  },
};

export const Interactive: Story = {
  render: (args) => {
    const [values, setValues] = useState(args.values);
    return (
      <MortgageScenarioInputs
        {...args}
        isEdited={(key) => values[key] !== args.values[key]}
        values={values}
        onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
      />
    );
  },
};

const stack = css({ display: "flex", flexDirection: "column", gap: "20px" });
const noop = () => undefined;

/** The saved sections above the zone, and the shared zone seeded from them (PR frames). */
const PageComposition = () => {
  const saved = useMemo(
    () => ({ loanAmount: 180000, interestRate: 4.5, remainingTerm: 20, overpayment: 0 }),
    [],
  );
  const scenario = useScenarioState(saved);
  const values = scenario.values;
  return (
    <div className={stack}>
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
      <ScenarioZone
        basis="Starting from your figures: £180,000 at 4.5%, 20 years left"
        footer={<span>Update your details</span>}
        isModified={scenario.isModified}
        title="Model a change to your mortgage"
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
      </ScenarioZone>
    </div>
  );
};

export const OnThePage: Story = {
  parameters: {
    layout: "fullscreen",
    // The light and dark decorator renders every landmark twice, which trips landmark-unique.
    a11y: { config: { rules: [{ id: "landmark-unique", enabled: false }] } },
  },
  render: () => <PageComposition />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slider = canvas.getAllByLabelText("Rate to try range slider")[0] as HTMLInputElement;
    const before = canvas.getAllByText("£180,000").length;
    fireEvent.change(slider, { target: { value: "6" } });
    await expect(canvas.getAllByText("Reset to saved figures").length).toBeGreaterThan(0);
    // The saved balance card is unchanged.
    await expect(canvas.getAllByText("£180,000").length).toBe(before);
    await expect(canvas.getAllByText("4.50%").length).toBeGreaterThan(0);
  },
};
