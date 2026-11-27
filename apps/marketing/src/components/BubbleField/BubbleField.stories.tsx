import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { BubbleField } from "./BubbleField";

const band = css({
  position: "relative",
  minHeight: "320px",
  overflowX: "clip",
  backgroundColor: "surface.canvas",
  py: { base: "12", md: "16" },
  px: "4",
});

const meta: Meta<typeof BubbleField> = {
  title: "3. Patterns/Marketing/BubbleField",
  component: BubbleField,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className={band}>
        <Story />
        <p>Band content sits above the field.</p>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BubbleField>;

/** Decoration only: hidden from assistive technology, one bubble per layout entry, below the content. */
const assertField: Story["play"] = async ({ canvasElement, args }) => {
  const field = canvasElement.querySelector("[data-bubble-field]");
  await expect(field?.getAttribute("aria-hidden")).toBe("true");
  await expect(field?.getAttribute("data-bubble-field")).toBe(args.layout);
  await expect(field?.querySelectorAll("span").length).toBeGreaterThan(1);
};

export const Light: Story = {
  args: { layout: "a" },
  globals: { theme: "light" },
  play: assertField,
};

export const Dark: Story = {
  args: { layout: "b" },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertField,
};

/** Each orb colour set on its own, for pages that use one. */
export const SkyTealLight: Story = {
  args: { layout: "a", sets: "skyTeal" },
  globals: { theme: "light" },
  play: assertField,
};

export const SkyTealDark: Story = {
  args: { layout: "a", sets: "skyTeal" },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertField,
};

export const VioletRoseLight: Story = {
  args: { layout: "c", sets: "violetRose" },
  globals: { theme: "light" },
  play: assertField,
};

export const VioletRoseDark: Story = {
  args: { layout: "c", sets: "violetRose" },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertField,
};
