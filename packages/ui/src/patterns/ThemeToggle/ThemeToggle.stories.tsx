import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import type { ThemePreference } from "../../hooks/useThemePreference";
import { ThemeToggle } from "./ThemeToggle";

const Stateful = ({
  initial = "system",
  variant,
}: {
  initial?: ThemePreference;
  variant?: "segmented" | "cycle";
}) => {
  const [preference, setPreference] = useState<ThemePreference>(initial);
  return <ThemeToggle preference={preference} variant={variant} onChange={setPreference} />;
};

const meta: Meta<typeof Stateful> = {
  title: "3. Patterns/ThemeToggle",
  component: Stateful,
};

export default meta;
type Story = StoryObj<typeof Stateful>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("button", { name: "System theme" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await userEvent.click(canvas.getByRole("button", { name: "Dark theme" }));
  await expect(canvas.getByRole("button", { name: "Dark theme" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

export const LightSelected: Story = { args: { initial: "light" }, globals: { theme: "light" } };

const cyclePlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await userEvent.click(
    canvas.getByRole("button", { name: "Colour theme: system. Change to light" }),
  );
  await expect(
    canvas.getByRole("button", { name: "Colour theme: light. Change to dark" }),
  ).toBeInTheDocument();
};

/** The one-button variant used in the phone and tablet top bar. */
export const Cycle: Story = {
  args: { variant: "cycle" },
  globals: { theme: "light" },
  play: cyclePlay,
};

export const CycleDark: Story = {
  args: { variant: "cycle" },
  globals: { theme: "dark" },
  play: cyclePlay,
};
