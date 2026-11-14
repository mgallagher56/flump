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
  name: "Stage 1: Debt Recovery (Desktop 1440px)",
  parameters: {
    // E8 waiver: color-contrast, heading-order, label-content-name-mismatch
    a11y: {
      config: {
        rules: [
          { id: "color-contrast", enabled: false },
          { id: "heading-order", enabled: false },
          { id: "label-content-name-mismatch", enabled: false },
        ],
      },
    },
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <Stage1View />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Debt payoff scenario")).toBeInTheDocument();
    await expect(canvas.getByText("Total Debt")).toBeInTheDocument();
  },
};

export const Stage1DebtRecoveryMobile: Story = {
  name: "Stage 1: Debt Recovery (Mobile 375px)",
  parameters: {
    // E8 waiver: color-contrast, heading-order, label-content-name-mismatch
    a11y: {
      config: {
        rules: [
          { id: "color-contrast", enabled: false },
          { id: "heading-order", enabled: false },
          { id: "label-content-name-mismatch", enabled: false },
        ],
      },
    },
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <Stage1View />,
};

export const Stage2CrossoverDesktop: Story = {
  name: "Stage 2: Crossover Bridge (Desktop 1440px)",
  parameters: {
    // E8 waiver: heading-order
    a11y: { config: { rules: [{ id: "heading-order", enabled: false }] } },
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <Stage2View />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Crossover scenario")).toBeInTheDocument();
  },
};

export const Stage2CrossoverMobile: Story = {
  name: "Stage 2: Crossover Bridge (Mobile 375px)",
  parameters: {
    // E8 waiver: heading-order
    a11y: { config: { rules: [{ id: "heading-order", enabled: false }] } },
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <Stage2View />,
};

export const Stage3AllowanceTaperDesktop: Story = {
  name: "Stage 3: Personal allowance taper (Desktop 1440px)",
  parameters: {
    // E8 waiver: heading-order
    a11y: { config: { rules: [{ id: "heading-order", enabled: false }] } },
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <Stage3View />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Personal allowance taper scenario")).toBeInTheDocument();
  },
};

export const Stage3AllowanceTaperMobile: Story = {
  name: "Stage 3: Personal allowance taper (Mobile 375px)",
  parameters: {
    // E8 waiver: heading-order
    a11y: { config: { rules: [{ id: "heading-order", enabled: false }] } },
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <Stage3View />,
};
