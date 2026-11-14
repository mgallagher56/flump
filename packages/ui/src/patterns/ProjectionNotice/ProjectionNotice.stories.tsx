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

const defaultPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const note = canvas.getByRole("note", { name: "Guidance, not advice" });
  await expect(note).toHaveTextContent(PROJECTION_NOTICE_TEXT);
  await expect(note).toHaveAttribute("data-notice", "projection");
  // The quiet note style has no fill in either theme.
  await expect(getComputedStyle(note).backgroundColor).toBe("rgba(0, 0, 0, 0)");
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
