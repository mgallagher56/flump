import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { PROJECTION_NOTICE_TEXT, ProjectionNotice } from "./ProjectionNotice";

const meta: Meta<typeof ProjectionNotice> = {
  title: "3. Patterns/ProjectionNotice",
  component: ProjectionNotice,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ProjectionNotice>;

/** The alpha channel of a computed CSS colour in any notation (`transparent`, `rgba()`, `oklch()`). */
const alphaOf = (colour: string): number => {
  if (colour === "transparent") return 0;
  const match = colour.match(/^[a-z]+\((.*)\)$/i);
  if (!match?.[1]) throw new Error(`Unrecognised colour: ${colour}`);
  const parts = match[1].split(/[\s,/]+/).filter(Boolean);
  // Three channels means no alpha: fully opaque.
  if (parts.length < 4) return 1;
  const alpha = parts[parts.length - 1] as string;
  return alpha.endsWith("%") ? Number.parseFloat(alpha) / 100 : Number.parseFloat(alpha);
};

const defaultPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const note = canvas.getByRole("note", { name: "Guidance, not advice" });
  await expect(note).toHaveTextContent(PROJECTION_NOTICE_TEXT);
  await expect(note).toHaveAttribute("data-notice", "projection");
  // The quiet note style has no fill in either theme. The browser may report a transparent
  // background as `rgba(0, 0, 0, 0)` or `oklch(0 0 0 / 0)`, so check the alpha, whatever the notation.
  await expect(alphaOf(getComputedStyle(note).backgroundColor)).toBe(0);
};

/** The quiet `note` style: secondary text, small info icon, top hairline, no fill. */
export const Default: Story = { play: defaultPlay };

export const Dark: Story = { globals: { theme: "dark" }, play: defaultPlay };

const card = css({
  backgroundColor: "surface.card",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "card",
  p: "6",
  display: "grid",
  gap: "4",
  maxWidth: "40rem",
});
const body = css({ margin: "0", textStyle: "body.md", color: "text.primary" });

/** At the foot of the region it qualifies, on that region's own surface. */
export const UnderAFigure: Story = {
  render: () => (
    <div className={card}>
      <p className={body}>At this rate your pot could reach about £412,000 by age 67.</p>
      <ProjectionNotice />
    </div>
  ),
};

export const UnderAFigureDark: Story = { ...UnderAFigure, globals: { theme: "dark" } };

export const CustomWording: Story = {
  args: { children: "Mortgage figures are estimates based on the rate and term you enter." },
};
