import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import type { ThemePreference } from "~/hooks/useTheme";
import { ThemeContext } from "~/ThemeContext";
import ThemeToggle from "./ThemeToggle";

const meta: Meta<typeof ThemeToggle> = {
  title: "Navigation/ThemeToggle",
  component: ThemeToggle,
  tags: ["autodocs"],
  decorators: [
    (Story, ctx) => {
      const [preference, setPreference] = useState<ThemePreference>(
        (ctx.args as { initial?: ThemePreference }).initial ?? "system",
      );
      return (
        <ThemeContext.Provider
          value={{ theme: "light", preference, setPreference, toggleTheme: () => {} }}
        >
          <Story />
        </ThemeContext.Provider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const System: Story = {};

export const SelectDark: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Dark theme" }));
    await expect(canvas.getByRole("button", { name: "Dark theme" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};
