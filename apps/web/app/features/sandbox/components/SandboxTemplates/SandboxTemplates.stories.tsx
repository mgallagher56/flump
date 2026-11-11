import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { SandboxTemplates, Stage1View, Stage2View, Stage3View } from "./SandboxTemplates";

const meta: Meta<typeof SandboxTemplates> = {
  title: "4. Page Templates (Sandbox States)/Financial Stage Simulations",
  component: SandboxTemplates,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof SandboxTemplates>;

export const Stage1DebtRecoveryDesktop: Story = {
  // E8 waiver: color-contrast, heading-order, label-content-name-mismatch
  name: "Stage 1: Debt Recovery (Desktop 1440px)",
  parameters: { a11y: { test: "todo" }, viewport: { defaultViewport: "desktop" } },
  render: () => <Stage1View />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Stage 1: Stabilise & Clear")).toBeInTheDocument();
    await expect(canvas.getByText("Total Debt")).toBeInTheDocument();
  },
};

export const Stage1DebtRecoveryMobile: Story = {
  // E8 waiver: color-contrast, heading-order, label-content-name-mismatch
  name: "Stage 1: Debt Recovery (Mobile 375px)",
  parameters: { a11y: { test: "todo" }, viewport: { defaultViewport: "mobile1" } },
  render: () => <Stage1View />,
};

export const Stage2CrossoverDesktop: Story = {
  // E8 waiver: heading-order
  name: "Stage 2: Crossover Bridge (Desktop 1440px)",
  parameters: { a11y: { test: "todo" }, viewport: { defaultViewport: "desktop" } },
  render: () => <Stage2View />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Stage 2: Crossover & Accumulate")).toBeInTheDocument();
  },
};

export const Stage2CrossoverMobile: Story = {
  // E8 waiver: heading-order
  name: "Stage 2: Crossover Bridge (Mobile 375px)",
  parameters: { a11y: { test: "todo" }, viewport: { defaultViewport: "mobile1" } },
  render: () => <Stage2View />,
};

export const Stage3TaxTrapDesktop: Story = {
  // E8 waiver: heading-order
  name: "Stage 3: Tax Trap Escape (Desktop 1440px)",
  parameters: { a11y: { test: "todo" }, viewport: { defaultViewport: "desktop" } },
  render: () => <Stage3View />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Stage 3: Tax Trap Escape & Wealth Acceleration"),
    ).toBeInTheDocument();
  },
};

export const Stage3TaxTrapMobile: Story = {
  // E8 waiver: heading-order
  name: "Stage 3: Tax Trap Escape (Mobile 375px)",
  parameters: { a11y: { test: "todo" }, viewport: { defaultViewport: "mobile1" } },
  render: () => <Stage3View />,
};
