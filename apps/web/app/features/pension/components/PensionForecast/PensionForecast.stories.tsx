import type { ProfileFacts } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { type FC, useMemo, useState } from "react";
import { expect, fireEvent, userEvent, within } from "storybook/test";
import { projectPension } from "../../forecast";
import { usePensionScenario } from "../../usePensionScenario";
import {
  buildForecastInput,
  PensionForecast,
  type PensionForecastBase,
  type PensionTool,
} from "./PensionForecast";

const base: PensionForecastBase = {
  salary: 58000,
  employerPercent: 3,
  isSalarySacrifice: false,
  passEmployerNi: false,
  currentPotTotal: 96000,
  directMonthlyContrib: 0,
};

const FACTS: ProfileFacts = {
  annualSalary: 58000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 8,
  isSalarySacrifice: false,
};

const Demo: FC<{ hasSalary?: boolean; age?: number | null }> = ({ hasSalary = true, age = 35 }) => {
  const scenario = usePensionScenario({ contributionPercent: 8, horizonYears: 32, growthRate: 5 });
  const [tool, setTool] = useState<PensionTool>("retirement");
  const savedResult = useMemo(
    () => projectPension(buildForecastInput(base, scenario.saved)),
    [scenario.saved],
  );
  return (
    <PensionForecast
      {...base}
      currentAge={age}
      hasSalary={hasSalary}
      savedEmployeePercent={8}
      savedResult={savedResult}
      scenario={scenario}
      takeHomeFacts={FACTS}
      tool={tool}
      onToolChange={setTool}
    />
  );
};

const meta: Meta<typeof Demo> = {
  title: "3. Financial Patterns & Sections/PensionForecast",
  component: Demo,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Demo>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Illustration, not saved")[0]).toBeDefined();
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBe(0);
    const slider = canvas.getAllByLabelText("Your contribution")[0] as HTMLElement;
    fireEvent.change(slider, { target: { value: "12" } });
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Reset to saved figures" })[0] as HTMLElement,
    );
    await expect((slider as HTMLInputElement).value).toBe("8");
  },
};

export const TakeHomeTool: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("tab", { name: "Take-home pay" })[0] as HTMLElement);
    await expect(canvas.getAllByText(/Move your contribution/)[0]).toBeDefined();
  },
};

export const AgeNotSaved: Story = { args: { age: null } };

export const NoSalary: Story = { args: { hasSalary: false } };
