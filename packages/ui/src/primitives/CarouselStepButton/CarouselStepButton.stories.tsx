import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { CarouselStepButton } from "./CarouselStepButton";

const row = css({ display: "flex", gap: "3", alignItems: "center" });

const meta: Meta<typeof CarouselStepButton> = {
  title: "2. Primitives/CarouselStepButton",
  component: CarouselStepButton,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof CarouselStepButton>;

const onPrevious = fn();
const onNext = fn();
const onEnd = fn();

const States = () => (
  <div className={row}>
    <CarouselStepButton direction="previous" onClick={onPrevious} targetLabel="Accounts" />
    <CarouselStepButton direction="next" onClick={onNext} targetLabel="Net worth" />
    <CarouselStepButton direction="next" disabled onClick={onEnd} targetLabel="Goals" />
  </div>
);

/** Previous and next with the item they show, and next at the end (focusable, does nothing). */
const statesPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  onPrevious.mockClear();
  onNext.mockClear();
  onEnd.mockClear();
  await userEvent.click(canvas.getByRole("button", { name: "Previous: Accounts" }));
  await userEvent.click(canvas.getByRole("button", { name: "Next: Net worth" }));
  const end = canvas.getByRole("button", { name: "Next" });
  await expect(end).toHaveAttribute("aria-disabled", "true");
  await userEvent.click(end);
  await expect(onPrevious).toHaveBeenCalledTimes(1);
  await expect(onNext).toHaveBeenCalledTimes(1);
  await expect(onEnd).not.toHaveBeenCalled();
};

export const StatesLight: Story = {
  globals: { theme: "light" },
  render: () => <States />,
  play: statesPlay,
};

export const StatesDark: Story = {
  globals: { theme: "dark" },
  render: () => <States />,
  play: statesPlay,
};
