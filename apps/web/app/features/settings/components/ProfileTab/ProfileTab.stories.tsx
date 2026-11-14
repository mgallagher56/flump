import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { DEFAULT_PROFILE } from "~/hooks/useUserProfile";
import { ProfileTab } from "./ProfileTab";

const meta: Meta<typeof ProfileTab> = {
  title: "3. Patterns/Settings/ProfileTab",
  component: ProfileTab,
  parameters: { layout: "padded" },
  args: {
    profile: { ...DEFAULT_PROFILE, firstName: "Jane", lastName: "Doe", taxRegion: "ENGLAND" },
  },
};

export default meta;
type Story = StoryObj<typeof ProfileTab>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // One save model: every change saves straight away, so there is no save button.
    await expect(canvas.queryByRole("button", { name: "Save changes" })).toBeNull();
    const first = canvas.getByLabelText("First name") as HTMLInputElement;
    await userEvent.type(first, "ie");
    await expect(first.value).toBe("Janeie");
  },
};

export const NoPicture: Story = {
  args: { profile: { ...DEFAULT_PROFILE, firstName: "Jane", avatarUrl: null } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Upload picture" })).toBeDefined();
    await expect(canvas.queryByRole("button", { name: "Delete picture" })).toBeNull();
  },
};
