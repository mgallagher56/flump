import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { DEFAULT_PROFILE } from "~/hooks/useUserProfile";
import { SettingsPage } from "./SettingsPage";

const meta: Meta<typeof SettingsPage> = {
  title: "3. Financial Patterns & Sections/Settings/SettingsPage",
  component: SettingsPage,
  parameters: { layout: "padded" },
  args: {
    initialProfile: {
      ...DEFAULT_PROFILE,
      firstName: "Jane",
      lastName: "Doe",
      taxRegion: "ENGLAND",
    },
    user: { email: "jane.doe@example.com" },
  },
};

export default meta;
type Story = StoryObj<typeof SettingsPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Your settings" })).toBeDefined();
    await userEvent.click(canvas.getByRole("tab", { name: "Data" }));
    await expect(canvas.getByTestId("reset-financial-data-trigger")).toBeDefined();
  },
};

export const UnsavedChangesPrompt: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("First name"), "t");
    await userEvent.click(canvas.getByRole("tab", { name: "Security" }));
    await expect(await within(document.body).findByText("Discard unsaved changes?")).toBeDefined();
  },
};
