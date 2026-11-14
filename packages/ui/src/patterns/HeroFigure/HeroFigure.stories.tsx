import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Button } from "../../primitives/Button/Button";
import { HeroFigure } from "./HeroFigure";

const meta: Meta<typeof HeroFigure> = {
  title: "3. Financial Patterns & Sections/HeroFigure",
  component: HeroFigure,
  parameters: { layout: "padded" },
  args: {
    label: "Net worth",
    value: 241000,
  },
  decorators: [
    (Story) => (
      <div className={css({ maxWidth: "40rem" })}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HeroFigure>;

const heroPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const group = canvas.getByRole("group", { name: "Net worth" });
  await expect(group).toHaveAttribute("data-tone", "hero");
  await expect(canvas.getByText("£241,000")).toBeInTheDocument();
  await expect(canvasElement.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
  await expect(canvasElement.querySelector('[data-decorative="true"]')).toHaveAttribute(
    "aria-hidden",
    "true",
  );
};

export const Default: Story = { globals: { theme: "light" }, play: heroPlay };

export const Dark: Story = { globals: { theme: "dark" }, play: heroPlay };

const deltaArgs = { delta: { direction: "up" as const, text: "+£1,240 since last month" } };

const deltaPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("+£1,240 since last month")).toBeInTheDocument();
  await expect(canvas.getByText("Up")).toBeInTheDocument();
};

/** One delta under the value, as an arrow plus text so meaning never rests on colour. */
export const WithDelta: Story = { args: deltaArgs, globals: { theme: "light" }, play: deltaPlay };

export const WithDeltaDark: Story = {
  args: deltaArgs,
  globals: { theme: "dark" },
  play: deltaPlay,
};

/** One short sub-line instead of a delta. */
export const WithSubline: Story = {
  args: {
    label: "Left over each month",
    value: 420,
    subline: "After bills, debts and saving",
  },
};

const NotSetAction = () => (
  <Button size="sm" variant="secondary">
    Add an account
  </Button>
);

const unsetArgs = {
  value: null,
  emptyPrompt: "Add your accounts to see your net worth.",
  emptyAction: <NotSetAction />,
};

const unsetPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvasElement.querySelector('[data-tone="hero"]')).toBeNull();
  await expect(canvas.getByText("Not set")).toBeInTheDocument();
  await expect(canvas.getByText("Add your accounts to see your net worth.")).toBeInTheDocument();
  const action = canvas.getByRole("button", { name: "Add an account" });
  await userEvent.tab();
  await expect(action).toHaveFocus();
};

/** Unknown value: no hero; a plain block with "Not set" and one setup prompt (P2.3, P3). */
export const NotSet: Story = { args: unsetArgs, globals: { theme: "light" }, play: unsetPlay };

export const NotSetDark: Story = { args: unsetArgs, globals: { theme: "dark" }, play: unsetPlay };

/** At 375px the fluid figure stays on one line with no horizontal overflow. */
export const Phone: Story = {
  args: { value: -1234567, ...deltaArgs },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole("group", { name: "Net worth" });
    await expect(group.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};
