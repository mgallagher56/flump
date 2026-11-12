import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { DirectionCSignoff } from "./DirectionCSignoff";

const meta: Meta<typeof DirectionCSignoff> = {
  title: "1. Foundations/Direction C sign-off",
  component: DirectionCSignoff,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof DirectionCSignoff>;

/** Parses the computed colour strings that the browser returns for resolved tokens. */
const parseRgb = (value: string): [number, number, number] => {
  const m = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!m) throw new Error(`Unexpected colour format: ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

const luminance = ([r, g, b]: [number, number, number]): number => {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const contrast = (a: string, b: string): number => {
  const [l1, l2] = [luminance(parseRgb(a)), luminance(parseRgb(b))].sort((p, q) => q - p);
  return (l1 + 0.05) / (l2 + 0.05);
};

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const hero = canvas.getAllByTestId("signoff-hero")[0];
  const figure = canvas.getAllByTestId("signoff-hero-figure")[0];
  await expect(figure).toHaveTextContent("£97,750");
  await expect(within(hero).getByText("Sample data")).toBeVisible();

  // Hero text must be legible on the deep-teal block (WCAG AA, 4.5:1).
  const ratio = contrast(getComputedStyle(figure).color, getComputedStyle(hero).backgroundColor);
  await expect(ratio).toBeGreaterThanOrEqual(4.5);

  // Keyboard focus ring is visible on a button.
  const button = canvas.getAllByRole("button", { name: "Add missing details" })[0];
  await userEvent.tab();
  let guard = 0;
  while (document.activeElement !== button && guard < 12) {
    await userEvent.tab();
    guard += 1;
  }
  await expect(button).toHaveFocus();
  const style = getComputedStyle(button);
  await expect(style.outlineStyle).not.toBe("none");
  await expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0);
};

export const Default: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
