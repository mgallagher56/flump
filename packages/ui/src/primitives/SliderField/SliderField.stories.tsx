import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { SliderField, type SliderFieldProps } from "./SliderField";

// SliderField is controlled, so a static `value` arg would reset the pill after every keystroke
// (typing "150" into a pill fixed at 50 yields 501, clamped to 500). Keep real state in the story.
const StatefulSliderField = ({ value, onChange, ...rest }: SliderFieldProps) => {
  const [current, setCurrent] = useState(value);
  return (
    <SliderField
      {...rest}
      value={current}
      onChange={(next) => {
        setCurrent(next);
        onChange(next);
      }}
    />
  );
};

const meta: Meta<typeof SliderField> = {
  title: "2. Primitives/SliderField",
  component: SliderField,
  parameters: {
    layout: "centered",
  },
  args: {
    label: "Monthly Debt Overpayment",
    value: 50,
    min: 0,
    max: 500,
    step: 10,
    unitPrefix: "£",
    unitSuffix: "/mo",
    onChange: fn(),
  },
  render: (args) => <StatefulSliderField {...args} />,
};

export default meta;
type Story = StoryObj<typeof SliderField>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const label = canvas.getByText("Monthly Debt Overpayment");
    await expect(label).toBeInTheDocument();

    const input = canvas.getByLabelText("Monthly Debt Overpayment input");
    await userEvent.clear(input);
    await userEvent.type(input, "150");
    await expect(args.onChange).toHaveBeenCalledWith(150);
  },
};

export const Percentage: Story = {
  args: {
    label: "Salary Sacrifice %",
    value: 8,
    min: 0,
    max: 50,
    step: 0.5,
    unitPrefix: "",
    unitSuffix: "%",
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  args: { value: 120 },
};

export const FocusWithinPill: Story = {
  args: { value: 100 },
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pillInput = canvas.getByLabelText("Monthly Debt Overpayment input");
    const slider = canvas.getByRole("slider");
    await expect(slider).toHaveAttribute("aria-valuetext", "£100/mo");
    for (let i = 0; i < 5 && document.activeElement !== pillInput; i++) {
      await userEvent.tab();
    }
    await expect(pillInput).toHaveFocus();
    await expect(pillInput.parentElement?.className).toContain("focusWithin:");
  },
};

export const Currency: Story = {
  args: {
    label: "Mortgage balance",
    value: 250000,
    min: 0,
    max: 600000,
    step: 1000,
    format: "currency",
    unitPrefix: "",
    unitSuffix: "",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Mortgage balance input") as HTMLInputElement;
    await expect(input.value).toBe("£250,000");
    await userEvent.clear(input);
    await userEvent.type(input, "9,999,999");
    await userEvent.tab();
    // Clamps to max on blur and reformats.
    await expect(input.value).toBe("£600,000");
  },
};

export const KeyboardSteps: Story = {
  args: { value: 100, min: 0, max: 500, step: 10 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slider = canvas.getByRole("slider") as HTMLInputElement;
    slider.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(slider.value).toBe("110");
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    await expect(slider.value).toBe("90");
    await userEvent.keyboard("{Home}");
    await expect(slider.value).toBe("0");
    await userEvent.keyboard("{End}");
    await expect(slider.value).toBe("500");
    await userEvent.keyboard("{PageDown}");
    await expect(Number(slider.value)).toBeLessThan(500);
    await userEvent.keyboard("{PageUp}");
    await expect(slider.value).toBe("500");
  },
};

export const NotSet: Story = {
  args: {
    value: null,
    label: "Interest rate",
    min: 0,
    max: 15,
    step: 0.1,
    format: "percent",
    unitPrefix: "",
    unitSuffix: "",
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText("Interest rate input") as HTMLInputElement;
    await expect(input.value).toBe("");
  },
};

export const Disabled: Story = {
  args: { disabled: true, value: 200, helperText: "Locked while the plan is fixed." },
};

export const LongLabel: Story = {
  args: {
    label: "Monthly overpayment you could comfortably afford after essential bills",
    value: 250,
    helperText: "Based on your sample surplus of £610 a month.",
  },
};
