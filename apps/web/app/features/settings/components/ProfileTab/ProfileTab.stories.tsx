import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { DEFAULT_PROFILE } from "~/hooks/useUserProfile";
import { ProfileTab } from "./ProfileTab";

const meta: Meta<typeof ProfileTab> = {
  title: "3. Financial Patterns & Sections/Settings/ProfileTab",
  component: ProfileTab,
  parameters: { layout: "padded" },
  args: {
    profile: { ...DEFAULT_PROFILE, firstName: "Jane", lastName: "Doe", taxRegion: "ENGLAND" },
    onDirtyChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ProfileTab>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const save = canvas.getByRole("button", { name: "Save changes" }) as HTMLButtonElement;
    await expect(save.disabled).toBe(true);
    await userEvent.type(canvas.getByLabelText("First name"), "ie");
    await expect(save.disabled).toBe(false);
    await expect(args.onDirtyChange).toHaveBeenLastCalledWith(true);
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
