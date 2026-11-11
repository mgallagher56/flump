import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { SectionBand } from "./SectionBand";

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
    children: (
      <div
        style={{ padding: "40px", textAlign: "center", border: "1px dashed var(--colors-border)" }}
      >
        Inner Section Content
      </div>
    ),
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
  parameters: { a11y: { test: "todo" } },
  args: {
    tone: "contrast",
  },
};
