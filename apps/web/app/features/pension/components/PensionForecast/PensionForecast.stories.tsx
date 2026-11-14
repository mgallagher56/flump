import type { Meta, StoryObj } from "@storybook/react";
import type { FC } from "react";
import { expect, fireEvent, userEvent, within } from "storybook/test";
import { usePensionScenario } from "../../usePensionScenario";
import { PensionForecast, type PensionForecastProps } from "./PensionForecast";

const facts: Omit<PensionForecastProps, "scenario"> = {
  hasSalary: true,
  salary: 50000,
  employeePercent: 6,
  employerPercent: 4,
  isSalarySacrifice: true,
  passEmployerNi: false,
  currentPotTotal: 30000,
  directMonthlyContrib: 100,
  portfolioReturnRate: 5.4,
  growthRateIsPlaceholder: false,
  hasPots: true,
};

const Demo: FC<Partial<typeof facts>> = (over) => {
  const scenario = usePensionScenario(5.4);
  return <PensionForecast {...facts} {...over} scenario={scenario} onEditDetails={() => {}} />;
};

const meta: Meta<typeof Demo> = {
  title: "3. Financial Patterns & Sections/PensionForecast",
  component: Demo,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Demo>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Illustration, not saved")).toBeDefined();
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBe(0);
  },
};

export const ModifiedThenReset: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByLabelText("Extra each month range slider"), {
      target: { value: "300" },
    });
    await userEvent.click(await canvas.findByRole("button", { name: "Reset to saved figures" }));
    await expect(canvas.getByRole("button", { name: "Reset to saved figures" })).toBeDisabled();
  },
};

export const NoSalary: Story = {
  args: { hasSalary: false, salary: 0 },
};
