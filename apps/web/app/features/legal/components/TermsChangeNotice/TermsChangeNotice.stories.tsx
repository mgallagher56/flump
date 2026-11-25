import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { TermsChangeNotice } from "./TermsChangeNotice";

const meta: Meta<typeof TermsChangeNotice> = {
  title: "3. Patterns/Legal/TermsChangeNotice",
  component: TermsChangeNotice,
  args: { terms: true, privacyNotice: false, effectiveFrom: "2026-12-09", next: "/app" },
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof TermsChangeNotice>;

export const TermsChanging: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "Read the changes" })).toBeDefined();
    await userEvent.click(canvas.getByRole("button", { name: "Hide this notice" }));
    await expect(canvas.queryByTestId("terms-change-notice")).toBeNull();
  },
};

export const BothChanging: Story = { args: { privacyNotice: true } };

export const PrivacyNoticeChanging: Story = { args: { terms: false, privacyNotice: true } };
