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

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const logos = canvas.getAllByRole("img", { name: "Flump" });
  await expect(logos).toHaveLength(3);
  // The body stops resolve to the logo's own tokens in this theme, not the charcoal button fill
  // and not the black an unresolved stop colour falls back to (owner report, 25 Nov 2026).
  const lit = resolved("--colors-primary-mark-lit", canvasElement);
  const mark = resolved("--colors-primary-mark", canvasElement);
  for (const logo of logos) {
    const [top, bottom] = Array.from(logo.querySelectorAll("stop")).map(
      (stop) => getComputedStyle(stop).stopColor,
    );
    await expect(top).toBe(lit);
    await expect(bottom).toBe(mark);
  }
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
