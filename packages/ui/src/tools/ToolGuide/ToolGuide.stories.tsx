import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { TOOL_GUIDES } from "../toolGuides";
import { ToolGuide } from "./ToolGuide";

const guide = TOOL_GUIDES["mortgage-overpayment-vs-isa-calculator"];

const meta: Meta<typeof ToolGuide> = {
  title: "3. Patterns/ToolGuide",
  component: ToolGuide,
  parameters: { layout: "padded" },
  args: { guideSections: guide.guideSections, faqs: guide.faqs },
};

export default meta;
type Story = StoryObj<typeof ToolGuide>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const details = Array.from(canvasElement.querySelectorAll("details"));
  // Both start closed, with their text already in the page.
  await expect(details).toHaveLength(2);
  for (const d of details) await expect(d).not.toHaveAttribute("open");
  await expect(canvasElement.textContent).toContain(guide.faqs[0]?.a ?? "");
  const [guidePanel, faqPanel] = details;
  await userEvent.click(guidePanel?.querySelector("summary") as HTMLElement);
  await expect(guidePanel).toHaveAttribute("open");
  await expect(
    canvas.getByRole("heading", { name: guide.guideSections[0]?.heading }),
  ).toBeVisible();
  await userEvent.click(faqPanel?.querySelector("summary") as HTMLElement);
  await expect(canvas.getByRole("heading", { name: guide.faqs[0]?.q })).toBeVisible();
};

/** Guide and FAQ under a calculator: native details panels, closed until opened. */
export const Default: Story = { play };

export const Dark: Story = { globals: { theme: "dark" }, play };
