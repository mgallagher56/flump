import type { Meta, StoryObj } from "@storybook/react";
import { createRoutesStub } from "react-router";
import { expect, within } from "storybook/test";
import type { TermsStatus } from "~/features/legal/terms";
import { TermsAcceptanceScreen } from "./TermsAcceptanceScreen";

const page = (version: string, path: string, changed = false) => ({
  version,
  updated: "25 November 2026",
  effectiveFrom: "2026-11-25",
  path,
  changed,
});

const firstTime: TermsStatus = {
  required: true,
  agreed: false,
  firstTime: true,
  terms: page("0.1", "/terms"),
  privacyNotice: page("0.2", "/privacy"),
};

const meta: Meta<typeof TermsAcceptanceScreen> = {
  title: "3. Patterns/Legal/TermsAcceptanceScreen",
  component: TermsAcceptanceScreen,
  args: {
    status: firstTime,
    marketingOrigin: "https://example.com",
    next: "/app",
    download: async () => undefined,
  },
  parameters: { layout: "fullscreen" },
  // The screen posts a form and the delete section uses a fetcher: both need a router.
  decorators: [
    (Story) => {
      const Stub = createRoutesStub([{ path: "/", Component: Story, action: async () => null }]);
      return <Stub initialEntries={["/"]} />;
    },
  ],
};

export default meta;
type Story = StoryObj<typeof TermsAcceptanceScreen>;

export const FirstTime: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Please read and agree to our terms" }),
    ).toBeDefined();
    await expect(canvas.getByRole("button", { name: "Agree and continue" })).toBeDefined();
    await expect(canvas.queryByRole("checkbox")).toBeNull();
  },
};

export const TermsChanged: Story = {
  args: {
    status: { ...firstTime, firstTime: false, terms: page("0.2", "/terms", true) },
  },
};

export const PrivacyNoticeChanged: Story = {
  args: {
    status: { ...firstTime, firstTime: false, privacyNotice: page("0.3", "/privacy", true) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("button", { name: "Continue" })).toBeDefined();
  },
};

export const ChangeComingUp: Story = {
  args: {
    status: {
      ...firstTime,
      required: false,
      firstTime: false,
      terms: { ...page("0.2", "/terms", true), effectiveFrom: "2026-12-09" },
    },
  },
};

export const ChangedWhileReading: Story = {
  args: { error: "changed" },
};
