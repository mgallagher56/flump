import { expectPageRules } from "@repo/ui/testing";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent, userEvent, within } from "storybook/test";
import PensionContainer from "./PensionContainer";

const workplacePot = {
  id: "w1",
  name: "Workplace pot",
  type: "Pension",
  balance: 96000,
  interestRate: 5,
  monthlyContribution: null,
  isCurrent: true,
};

const loaderData = (acc: unknown[], userProfile: Record<string, unknown>) => ({
  accounts: acc,
  accountDetails: [],
  userProfile: { setupChecklistCompletedSteps: ["pension"], ...userProfile },
});

/** The onboarded user from the E16 audit: £58,000, 8% and 3%, one £96,000 pot. */
const onboarded = {
  annualSalary: 58000,
  pensionPercent: 8,
  pensionEmployerPercent: 3,
  isSalarySacrifice: false,
  isSalarySacrificeEmployerNi: false,
  employmentType: "employed",
  birthYear: new Date().getFullYear() - 35,
};

// The Storybook react-router mock serves `parameters.router.loaderData` to useLoaderData.
const meta: Meta<typeof PensionContainer> = {
  title: "4. Pages/Pension",
  component: PensionContainer,
  parameters: { layout: "padded", router: { loaderData: loaderData([workplacePot], onboarded) } },
};

export default meta;
type Story = StoryObj<typeof PensionContainer>;

// The Storybook decorator renders light and dark side by side, so each theme is checked alone.
const themes = (canvasElement: HTMLElement): HTMLElement[] => {
  const roots = Array.from(canvasElement.querySelectorAll<HTMLElement>("[data-theme]")).filter(
    (el) => !el.querySelector("[data-theme]"),
  );
  return roots.length > 0 ? roots : [canvasElement];
};

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect((await canvas.findAllByText("Total in your pots")).length).toBeGreaterThan(0);
    for (const root of themes(canvasElement)) {
      expectPageRules(root, { maxFigures: 12, projectionNotices: 1 });
    }
  },
};

export const Empty: Story = {
  parameters: { router: { loaderData: loaderData([], { annualSalary: null }) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect((await canvas.findAllByText("No pension pots yet")).length).toBeGreaterThan(0);
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBe(0);
  },
};

export const AgeNotSaved: Story = {
  parameters: {
    router: { loaderData: loaderData([workplacePot], { ...onboarded, birthYear: null }) },
  },
};

export const TaxBand: Story = {
  parameters: {
    router: {
      loaderData: loaderData([workplacePot], {
        ...onboarded,
        annualSalary: 110000,
        pensionPercent: 0,
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      (await canvas.findAllByRole("button", { name: "Model this contribution" })).length,
    ).toBeGreaterThan(0);
  },
};

export const ScenarioZone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const zone = (
      await canvas.findAllByRole("region", { name: "Model a change to your pension" })
    )[0] as HTMLElement;
    await expect(within(zone).getByText("Illustration, not saved")).toBeDefined();
    const heroBefore = canvasElement.querySelector("[data-tone='hero']")?.textContent;
    fireEvent.change(within(zone).getAllByLabelText("Your contribution")[0] as HTMLElement, {
      target: { value: "12" },
    });
    await userEvent.click(within(zone).getByRole("button", { name: "Reset to saved figures" }));
    await expect(canvasElement.querySelector("[data-tone='hero']")?.textContent).toBe(heroBefore);
  },
};
