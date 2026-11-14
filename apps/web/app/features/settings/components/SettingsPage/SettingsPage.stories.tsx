import { expectPageRules } from "@repo/ui/testing";
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
    await expect(canvas.getByRole("heading", { level: 1, name: "Settings" })).toBeDefined();
    await expect(canvasElement.querySelector('[data-tone="hero"]')).toBeNull();
    // Scope to one page tree: the side-by-side theme view renders the page twice.
    expectPageRules(canvasElement.querySelector("#settings-page") ?? canvasElement);
    const save = canvas.getByRole("button", { name: "Save changes" }) as HTMLButtonElement;
    await expect(save.disabled).toBe(true);
    await userEvent.click(canvas.getByRole("tab", { name: "Data" }));
    await expect(canvas.getByTestId("reset-financial-data-trigger")).toBeDefined();
  },
};

/** The page as first opened, on the Profile tab. */
export const ProfileTabOpen: Story = {};

export const UnsavedChangesPrompt: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("First name"), "t");
    await userEvent.click(canvas.getByRole("tab", { name: "Security" }));
    const body = within(document.body);
    await expect(await body.findByText("Discard unsaved changes?")).toBeDefined();
    await userEvent.click(body.getByRole("button", { name: "Discard changes" }));
    await expect(await canvas.findByTestId("settings-security-tab")).toBeDefined();
    await expect(canvas.getByRole("tab", { name: "Security" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  },
};
