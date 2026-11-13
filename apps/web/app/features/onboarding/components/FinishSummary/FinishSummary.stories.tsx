import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { deriveOnboardingSummary } from "../../deriveOnboardingSummary";
import { inferModules } from "../../inferModules";
import { INITIAL_VALUES, type OnboardingValues } from "../../types";
import { FinishSummary } from "./FinishSummary";

const make = (patch: Partial<OnboardingValues>) => {
  const values = { ...INITIAL_VALUES, ...patch };
  return { values, summary: deriveOnboardingSummary(values), modules: inferModules(values) };
};

const meta: Meta<typeof FinishSummary> = {
  title: "Onboarding/FinishSummary",
  component: FinishSummary,
  parameters: { layout: "padded" },
  args: { isSubmitting: false, onBack: fn(), onEdit: fn(), onFinish: fn() },
};
export default meta;
type Story = StoryObj<typeof FinishSummary>;

export const Complete: Story = {
  args: make({
    grossSalary: 45000,
    taxRegion: "ENGLAND",
    housingStatus: "mortgage",
    monthlyHousingCost: 900,
    propertyValue: 300000,
    mortgageBalance: 200000,
    cashSavings: 5000,
  }),
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: /finish and open dashboard/i }),
    );
    await expect(args.onFinish).toHaveBeenCalled();
  },
};

export const MissingIncome: Story = {
  args: make({}),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: /finish and open dashboard/i })).toBeDisabled();
    await userEvent.click(canvas.getByRole("button", { name: /go to you and income/i }));
    await expect(args.onEdit).toHaveBeenCalledWith(1);
  },
};

const COMPLETE = make({ grossSalary: 45000, taxRegion: "ENGLAND", cashSavings: 5000 });

/** The profile saved but seeding failed: the error sits beside Finish and the note is truthful. */
export const PartialSave: Story = {
  args: {
    ...COMPLETE,
    error:
      "We saved some of your details but not all. Check your connection and finish again to add the rest.",
    saveState: "partial",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(/saved some of your details/i);
    await expect(canvas.getByTestId("onboarding-saved-note")).toHaveTextContent(
      "Some details are saved. Finish again to add the rest.",
    );
  },
};

/** While saving, Finish keeps focus and ignores clicks instead of becoming disabled. */
export const Saving: Story = {
  args: { ...COMPLETE, isSubmitting: true },
  play: async ({ canvasElement, args }) => {
    const finish = within(canvasElement).getByRole("button", { name: /saving/i });
    await expect(finish).toHaveAttribute("aria-disabled", "true");
    await expect(finish).toBeEnabled();
    await userEvent.click(finish);
    await expect(args.onFinish).not.toHaveBeenCalled();
  },
};
