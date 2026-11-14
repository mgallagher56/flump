import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { createStore, Provider } from "jotai";
import { expect, fn, userEvent, within } from "storybook/test";
import { DEFAULT_PROFILE, type UserProfile, userProfileAtom } from "~/hooks/useUserProfile";
import { TakeHomeCalculator } from "./TakeHomeCalculator";

const withSavedProfile =
  (overrides: Partial<UserProfile>): Decorator =>
  (Story) => {
    const store = createStore();
    store.set(userProfileAtom, {
      ...DEFAULT_PROFILE,
      employmentType: "employed",
      pensionPercent: 5,
      isSalarySacrifice: false,
      ...overrides,
    } as UserProfile);
    return (
      <Provider store={store}>
        <Story />
      </Provider>
    );
  };

const meta: Meta<typeof TakeHomeCalculator> = {
  title: "5. Calculators/Take-home/TakeHomeCalculator",
  component: TakeHomeCalculator,
  parameters: { layout: "padded" },
  args: { initialSalary: 62000, onApplyIncrease: fn() },
  decorators: [withSavedProfile({})],
};

export default meta;
type Story = StoryObj<typeof TakeHomeCalculator>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Monthly take-home")[0]).toBeDefined();
    await expect(canvas.getAllByText("Where your pay goes")[0]).toBeDefined();
    const button = canvas.getAllByRole("button", { name: "Model this in savings" })[0];
    if (!button) throw new Error("Button missing");
    await userEvent.click(button);
    await expect(args.onApplyIncrease).toHaveBeenCalled();
  },
};

export const WithStudentLoan: Story = {
  decorators: [withSavedProfile({ studentLoanPlans: ["PLAN_2"] } as Partial<UserProfile>)],
};

export const NoSalary: Story = {
  args: { initialSalary: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("link", { name: "Add salary" })[0]).toBeDefined();
  },
};
