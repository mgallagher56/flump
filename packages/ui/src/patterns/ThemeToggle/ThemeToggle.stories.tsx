import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import type { ThemePreference } from "../../hooks/useThemePreference";
import { ThemeToggle } from "./ThemeToggle";

const Stateful = ({ initial = "system" }: { initial?: ThemePreference }) => {
  const [preference, setPreference] = useState<ThemePreference>(initial);
  return <ThemeToggle preference={preference} onChange={setPreference} />;
};

const meta: Meta<typeof Stateful> = {
  title: "3. Financial Patterns & Sections/ThemeToggle",
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
