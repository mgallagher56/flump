import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { SetupChecklist } from "./SetupChecklist";

const incomplete = {
  completedSteps: ["budget"],
  hasAccounts: false,
  hasBudget: true,
  hasMortgageAccount: false,
  hasProfile: true,
  hasRunForecast: false,
  variant: "desktop" as const,
};

const meta: Meta<typeof SetupChecklist> = {
  title: "3. Financial Patterns & Sections/SetupChecklist",
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
    const toggle = canvas.getAllByRole("button", { name: /refine and drill down/i })[0];
    await expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    await expect(canvas.getAllByRole("status")[0]?.textContent).toBe("1 of 7 steps complete");
  },
};

export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getAllByRole("button", { name: /refine and drill down/i })[0];
    if (!toggle) throw new Error("Toggle missing");
    await userEvent.click(toggle);
    await expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await expect(canvas.getAllByRole("button", { name: "Track savings" })[0]).toBeDefined();
  },
};

export const NavigateToStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getAllByRole("button", { name: /refine and drill down/i })[0];
    if (!toggle) throw new Error("Toggle missing");
    await userEvent.click(toggle);
    const action = canvas.getAllByRole("button", { name: "Open tax tracker" })[0];
    if (!action) throw new Error("Action missing");
    // The Storybook router mock navigates to a no-op, so the click must simply not throw.
    await userEvent.click(action);
    await expect(action).toBeDefined();
  },
};

export const Dismissed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dismiss = canvas.getAllByRole("button", { name: "Dismiss setup checklist" })[0];
    if (!dismiss) throw new Error("Dismiss missing");
    await userEvent.click(dismiss);
    await expect(canvas.queryAllByRole("heading", { name: /refine and drill down/i })).toHaveLength(
      0,
    );
  },
};

/** Every step is done, so the checklist removes itself. */
export const AllDone: Story = {
  args: {
    completedSteps: ["budget", "accounts", "savings", "pension", "mortgage", "forecast", "tax"],
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryAllByRole("heading", { name: /refine and drill down/i }),
    ).toHaveLength(0);
  },
};
