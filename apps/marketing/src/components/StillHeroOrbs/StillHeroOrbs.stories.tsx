import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { StillHeroOrbs } from "./StillHeroOrbs";

const meta: Meta<typeof StillHeroOrbs> = {
  title: "3. Patterns/Marketing/StillHeroOrbs",
  component: StillHeroOrbs,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <section
        aria-label="Still hero orbs"
        className={css({
          position: "relative",
          isolation: "isolate",
          minHeight: "17rem",
          backgroundColor: "surface.canvas",
        })}
      >
        <Story />
      </section>
    ),
  ],
  args: { tones: ["sky", "violet", "teal", "rose"] },
};

export default meta;
type Story = StoryObj<typeof StillHeroOrbs>;

const assertOrbs: Story["play"] = async ({ canvasElement }) => {
  const stage = within(canvasElement).getByTestId("hero-stage");
  await expect(stage.querySelectorAll("[data-glass-orb]")).toHaveLength(4);
  await expect(stage.getAttribute("data-scene")).toBe("still");
};

export const Light: Story = { globals: { theme: "light" }, play: assertOrbs };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertOrbs,
};
