import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { SetupChecklist } from "./SetupChecklist";

const incomplete = {
  completedSteps: ["budget"],
  hasAccounts: true,
  hasBudget: true,
  hasMortgageAccount: false,
  hasProfile: true,
  hasRunForecast: false,
  enabledPages: ["accounts", "budget", "savings", "pension", "mortgage"],
};

const meta: Meta<typeof SetupChecklist> = {
  title: "3. Patterns/Dashboard/SetupChecklist",
  component: SetupChecklist,
  parameters: { layout: "padded" },
  args: incomplete,
  beforeEach: () => {
    try {
      window.localStorage.removeItem("flump_setup_checklist_dismissed");
    } catch {
      // Storage may be unavailable in the story runner.
    }
  },
};

export default meta;
type Story = StoryObj<typeof SetupChecklist>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Collapsed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("progressbar", { name: "Setup progress" })[0]).toHaveAttribute(
      "aria-valuetext",
      "2 of 5",
    );
    await expect(canvas.getAllByText(/Next: Add your savings rates/)[0]).toBeDefined();
  },
};

export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getAllByRole("button", { name: /Finish setting up/ })[0];
    if (!toggle) throw new Error("Toggle missing");
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(within(canvasElement).getAllByText("Add your savings rates")[0]).toBeVisible();
  },
};

export const FinishedDuringVisit: Story = {
  args: {
    completedSteps: ["budget", "accounts", "savings", "pension"],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getAllByRole("button", { name: /Finish setting up/ })[0];
    if (!toggle) throw new Error("Toggle missing");
    await userEvent.click(toggle);
    const skip = canvas.getAllByRole("button", { name: /Not for me/ })[0];
    if (!skip) throw new Error("Skip button missing");
    await userEvent.click(skip);
    await expect(canvas.getAllByText("Setup finished")[0]).toBeVisible();
  },
};
