import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { SavingsForecast, type SavingsForecastValues } from "./SavingsForecast";

const Harness = ({ initial }: { initial: SavingsForecastValues }) => {
  const [values, setValues] = useState(initial);
  return (
    <SavingsForecast
      startYear={2026}
      startingBalance={21000}
      values={values}
      onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
    />
  );
};

const meta: Meta<typeof Harness> = {
  title: "3. Financial Patterns & Sections/SavingsForecast",
  component: Harness,
  args: { initial: { monthly: 300, rate: 4, years: 5, todaysMoney: false, goal: null } },
};

export default meta;
type Story = StoryObj<typeof Harness>;

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: /More options/ })[0]);
    await expect(canvas.getAllByLabelText("Your own goal")[0]).toBeDefined();
  },
};

export const NothingPaidIn: Story = {
  args: { initial: { monthly: null, rate: null, years: 5, todaysMoney: false, goal: null } },
};
