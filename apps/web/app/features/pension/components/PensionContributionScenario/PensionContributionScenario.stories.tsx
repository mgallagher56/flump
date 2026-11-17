import type { ProfileFacts } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import type { FC } from "react";
import { expect, userEvent, within } from "storybook/test";
import { useScenarioState } from "~/hooks/useScenarioState";
import { PensionContributionScenario } from "./PensionContributionScenario";

const FACTS: ProfileFacts = {
  annualSalary: 60_000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: ["PLAN_2"],
  pensionPercent: 5,
  isSalarySacrifice: true,
};

const Harness: FC<{ hasSalary: boolean }> = ({ hasSalary }) => {
  const scenario = useScenarioState({ contributionPercent: 5 });
  return (
    <PensionContributionScenario
      hasSalary={hasSalary}
      salary={hasSalary ? 60_000 : 0}
      savedEmployeePercent={5}
      scenario={scenario}
      takeHomeFacts={FACTS}
    />
  );
};

/** The Storybook preview renders every story side by side in light and dark. */
const meta: Meta<typeof Harness> = {
  title: "3. Patterns/Pension/PensionContributionScenario",
  component: Harness,
  parameters: { layout: "padded" },
  args: { hasSalary: true },
};

export default meta;
type Story = StoryObj<typeof Harness>;

export const WithSalary: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slider = canvas.getAllByLabelText("Your contribution")[0] as HTMLElement;
    slider.focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await expect(canvas.getAllByText("Edited. Not saved.")[0]).toBeDefined();
  },
};

export const NoSalary: Story = {
  args: { hasSalary: false },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText(/effect of a change on your take-home pay/)[0],
    ).toBeDefined();
  },
};
