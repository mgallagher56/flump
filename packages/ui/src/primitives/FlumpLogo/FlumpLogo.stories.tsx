import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { FlumpLogo } from "./FlumpLogo";

const row = css({
  display: "flex",
  alignItems: "flex-end",
  gap: "6",
  p: "6",
  backgroundColor: "surface.canvas",
});

const meta: Meta<typeof FlumpLogo> = {
  title: "2. Primitives/FlumpLogo",
  component: FlumpLogo,
  parameters: { layout: "padded" },
  render: () => (
    <div className={row}>
      <FlumpLogo label="Flump" size="sm" />
      <FlumpLogo label="Flump" size="md" />
      <FlumpLogo label="Flump" size="lg" />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof FlumpLogo>;

/** The colour a CSS variable resolves to in the current theme, as the browser computes it. */
const resolved = (variable: string, host: HTMLElement) => {
  const probe = document.createElement("span");
  probe.style.color = `var(${variable})`;
  host.append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
};

/** The bubble tints, back to front, and the colour lighting each one's lower right edge. */
const BUBBLES = [
  ["violet", "rose"],
  ["sky", "violet"],
  ["teal", "violet"],
] as const;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const logos = canvas.getAllByRole("img", { name: "Flump" });
  await expect(logos).toHaveLength(3);
  // Every stop resolves to the logo's own tokens in this theme, not the black an unresolved stop
  // colour falls back to (owner report, 25 Nov 2026).
  for (const logo of logos) {
    const gradients = Array.from(logo.querySelectorAll("radialGradient")).slice(2);
    for (const [i, [tone, light]] of BUBBLES.entries()) {
      const [body, rim] = gradients
        .slice(i * 3, i * 3 + 2)
        .map((g) =>
          Array.from(g.querySelectorAll("stop")).map((s) => getComputedStyle(s).stopColor),
        );
      for (const colour of body ?? []) {
        await expect(colour).toBe(resolved(`--colors-logo-${tone}`, canvasElement));
      }
      for (const colour of rim ?? []) {
        await expect(colour).toBe(resolved(`--colors-logo-${light}`, canvasElement));
      }
    }
  }
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
