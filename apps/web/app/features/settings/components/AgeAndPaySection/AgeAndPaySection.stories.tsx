import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { DEFAULT_PROFILE } from "~/hooks/useUserProfile";
import { AgeAndPaySection } from "./AgeAndPaySection";

const meta: Meta<typeof AgeAndPaySection> = {
  title: "3. Patterns/Settings/AgeAndPaySection",
  component: AgeAndPaySection,
  parameters: { layout: "padded" },
  args: {
    now: new Date("2026-11-18T12:00:00Z"),
    onSave: fn(async () => {}),
    profile: {
      ...DEFAULT_PROFILE,
      birthYear: 1986,
      annualSalary: 52000,
      pensionPercent: 6,
      pensionEmployerPercent: 4,
    },
  },
};

export default meta;
type Story = StoryObj<typeof AgeAndPaySection>;

export const Saved: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("You turn 40 this year.")).toBeDefined();
    const year = canvas.getByLabelText("Year of birth") as HTMLInputElement;
    await userEvent.clear(year);
    await userEvent.type(year, "1990{enter}");
    await expect(args.onSave).toHaveBeenCalledWith({ birthYear: 1990 });
  },
};

export const SavedDark: Story = { ...Saved, globals: { theme: "dark" } };

/** A new profile: no year or salary, and the 5% and 3% creation defaults read as not set. */
export const NothingSet: Story = {
  args: {
    profile: { ...DEFAULT_PROFILE, birthYear: null, annualSalary: null },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not set", { selector: ":not(option)" })).toHaveLength(2);
    const year = canvas.getByLabelText("Year of birth");
    await userEvent.type(year, "1899{enter}");
    await expect(canvas.getByText("Enter a year between 1900 and 2026.")).toBeDefined();
    await expect(args.onSave).not.toHaveBeenCalled();
    // Pounds a month need a saved salary, so the switch stays on "% of salary" and says why.
    await expect(canvas.getByText("Add your salary to enter pounds a month.")).toBeDefined();
  },
};

export const NothingSetDark: Story = { ...NothingSet, globals: { theme: "dark" } };

/** The contributions entered as pounds a month: saved as the percentage of the saved salary. */
export const PoundsAMonth: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "£ a month" }));
    const own = canvas.getByLabelText("Your pension contribution (£ a month)") as HTMLInputElement;
    // £52,000 at 6%: 3,120 a year ÷ 12 = £260 a month.
    await expect(own.value).toBe("260");
    await expect(canvas.getByText("6% of salary")).toBeDefined();
    await userEvent.clear(own);
    await userEvent.type(own, "300{enter}");
    // £300 a month: 3,600 ÷ 52,000 = 6.92% to two places.
    await expect(args.onSave).toHaveBeenCalledWith({
      pensionPercent: 6.92,
      pensionEmployerPercent: 4,
    });
  },
};

export const PoundsAMonthDark: Story = { ...PoundsAMonth, globals: { theme: "dark" } };
