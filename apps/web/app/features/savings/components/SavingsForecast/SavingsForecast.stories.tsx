import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
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
  title: "5. Calculators/Savings/SavingsForecast",
  component: Harness,
  args: { initial: { monthly: 300, rate: 4, years: 5, todaysMoney: false, goal: null } },
};

export default meta;
type Story = StoryObj<typeof Harness>;

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: /Goal and inflation options/ })[0]);
    await expect(canvas.getAllByLabelText("Your own goal")[0]).toBeDefined();
  },
};

export const NothingPaidIn: Story = {
  args: { initial: { monthly: null, rate: null, years: 5, todaysMoney: false, goal: null } },
};

/**
 * A narrow column where recharts keeps every year label. The last label is end-anchored to the
 * plot edge, so without the shared tick gap it ran into the one before it (2030 and 2031 on a phone).
 */
export const NarrowColumn: Story = {
  decorators: [
    (StoryFn) => (
      <div style={{ width: 420 }}>
        <StoryFn />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const yearLabels = () => {
      const found = Array.from(canvasElement.querySelectorAll<SVGTextElement>("svg text")).filter(
        (text) => /^20\d\d$/.test(text.textContent ?? ""),
      );
      if (found.length === 0) throw new Error("the year axis has not drawn yet");
      return found;
    };
    const boxes = (await waitFor(yearLabels))
      .map((label) => ({ text: label.textContent, box: label.getBoundingClientRect() }))
      .sort((a, b) => a.box.left - b.box.left);
    await expect(boxes[boxes.length - 1]?.text).toBe("2031");
    for (let i = 1; i < boxes.length; i += 1) {
      await expect(boxes[i]?.box.left).toBeGreaterThanOrEqual(boxes[i - 1]?.box.right ?? 0);
    }
  },
};
