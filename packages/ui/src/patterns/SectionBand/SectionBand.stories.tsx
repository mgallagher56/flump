import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { SectionBand } from "./SectionBand";

const placeholder = css({
  p: "10",
  textAlign: "center",
  borderWidth: "1px",
  borderStyle: "dashed",
  borderColor: "border",
  borderRadius: "xl",
  color: "text.secondary",
});

const meta: Meta<typeof SectionBand> = {
  title: "3. Financial Patterns & Sections/SectionBand",
  component: SectionBand,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    indexBadge: "PILLAR 01",
    title: "Master Your Financial Timeline",
    subtitle:
      "Automated cash-flow modeling, tax trap defusal, and multi-pot retirement projections.",
    children: <div className={placeholder}>Inner section content</div>,
  },
};

export default meta;
type Story = StoryObj<typeof SectionBand>;

export const CanvasTone: Story = {
  args: {
    tone: "canvas",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Master Your Financial Timeline")).toBeInTheDocument();
  },
};

export const SubtleTone: Story = {
  args: {
    tone: "subtle",
  },
};

export const TintedTone: Story = {
  args: {
    tone: "tinted",
  },
};

export const ContrastTone: Story = {
  // E8 waiver: color-contrast
  parameters: { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } } },
  args: {
    tone: "contrast",
  },
};

export const AppVariant: Story = {
  parameters: { layout: "padded" },
  args: {
    variant: "app",
    id: "where-you-stand",
    indexBadge: undefined,
    title: "Where you stand",
    subtitle: "Your main figures this month. Sample data.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region", { name: "Where you stand" })).toBeInTheDocument();
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Where you stand" }),
    ).toBeInTheDocument();
  },
};

export const AppVariantTitleOnly: Story = {
  parameters: { layout: "padded" },
  args: {
    variant: "app",
    indexBadge: undefined,
    title: "Over time and by account",
    subtitle: undefined,
  },
};
