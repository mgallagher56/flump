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

const SPOTS = [
  { set: "skyTeal", x: "20cqw", y: "30cqh", size: "96px", show: "wide", drift: 30 },
  { set: "violetRose", x: "80cqw", y: "70cqh", size: "64px", show: "wide", drift: 60 },
  { set: "skyTeal", x: "50cqw", y: "80cqh", size: "48px", show: "stacked", drift: 0 },
  { set: "violetRose", x: "50cqw", y: "20cqh", size: "40px", show: "phone", drift: 0 },
] as const;

/** The home hero's own spots (`fit="hero"`): placed by the page's table, each in its range of widths. */
export const SpotsLight: Story = {
  args: { fit: "hero", spots: SPOTS },
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const field = canvasElement.querySelector("[data-bubble-field]");
    await expect(field?.getAttribute("aria-hidden")).toBe("true");
    await expect(field?.getAttribute("data-bubble-field")).toBe("spots");
    await expect(field?.querySelectorAll("span").length).toBe(SPOTS.length);
  },
};
