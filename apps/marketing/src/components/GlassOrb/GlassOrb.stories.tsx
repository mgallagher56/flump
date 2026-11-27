import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { GlassOrb, ORB_TONES } from "./GlassOrb";

const meta: Meta<typeof GlassOrb> = {
  title: "3. Patterns/Marketing/GlassOrb",
  component: GlassOrb,
  parameters: { layout: "padded" },
  args: { tone: "sky", size: "lg" },
  render: (args) => (
    <div className={css({ display: "flex", gap: "6", alignItems: "center", padding: "6" })}>
      {ORB_TONES.map((tone) => (
        <GlassOrb key={tone} size={args.size} tone={tone} />
      ))}
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof GlassOrb>;

const assertOrbs: Story["play"] = async ({ canvasElement }) => {
  const orbs = canvasElement.querySelectorAll("[data-glass-orb]");
  await expect(orbs).toHaveLength(4);
  for (const orb of Array.from(orbs)) await expect(orb.getAttribute("aria-hidden")).toBe("true");
};

export const Light: Story = { globals: { theme: "light" }, play: assertOrbs };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertOrbs,
};
