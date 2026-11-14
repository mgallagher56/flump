import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import {
  COMMITTED_BATCH,
  EXISTING_ACCOUNTS,
  EXPIRED_BATCH,
  LONG_PREVIEW,
  PREVIEW,
  REVERTED_BATCH,
  STAGED_BATCH,
} from "../../fixtures";
import { ImportReviewPage } from "./ImportReviewPage";

const meta: Meta<typeof ImportReviewPage> = {
  title: "6. Pages/Imports/ImportReviewPage",
  component: ImportReviewPage,
  parameters: { layout: "fullscreen" },
  args: {
    batch: STAGED_BATCH,
    initialPreview: PREVIEW,
    existingAccounts: EXISTING_ACCOUNTS,
    now: new Date("2026-11-14T10:00:00Z"),
    actions: {
      preview: fn(async () => PREVIEW),
      commit: fn(async () => COMMITTED_BATCH),
      revert: fn(async () => REVERTED_BATCH),
    },
  },
};

export default meta;
type Story = StoryObj<typeof ImportReviewPage>;

export const Review: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tick = canvas.getByTestId("import-tick-saver:2026-09") as HTMLInputElement;
    await expect(tick.checked).toBe(false);
    await userEvent.click(tick);
    await expect(canvas.getByTestId("import-plan").textContent).toContain("2 replaced");
  },
};

export const LongImport: Story = {
  args: { initialPreview: LONG_PREVIEW },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("All changes")).toBeDefined();
  },
};

export const Saved: Story = {
  args: { batch: COMMITTED_BATCH, initialPreview: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("import-undo")).toBeDefined();
  },
};

export const Undone: Story = {
  args: { batch: REVERTED_BATCH, initialPreview: null },
};

export const Expired: Story = {
  args: { batch: EXPIRED_BATCH, initialPreview: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("This import has expired")).toBeDefined();
  },
};
