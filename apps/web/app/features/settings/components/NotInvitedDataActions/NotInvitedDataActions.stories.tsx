import type { Meta, StoryObj } from "@storybook/react";
import { createRoutesStub } from "react-router";
import { expect, fn, userEvent, within } from "storybook/test";
import { NotInvitedDataActions } from "./NotInvitedDataActions";

const download = fn(async () => undefined);
const deleteAction = fn(async () => ({ outcome: "recent_login_required" }));

function Sections() {
  return <NotInvitedDataActions download={download} />;
}

/** A router around the sections, so the delete request has the settings action to post to. */
const withRouter = (): React.ReactElement => {
  const Stub = createRoutesStub([
    { path: "/", Component: Sections },
    { path: "/app/profile", action: deleteAction },
  ]);
  return <Stub initialEntries={["/"]} />;
};

const meta: Meta<typeof NotInvitedDataActions> = {
  title: "3. Patterns/Settings/NotInvitedDataActions",
  component: NotInvitedDataActions,
  render: withRouter,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof NotInvitedDataActions>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [heading] = await canvas.findAllByRole("heading", { name: "Download your data" });
    await expect(heading).toBeDefined();
    await expect(canvas.getAllByRole("heading", { name: "Delete your account" })).toHaveLength(
      canvas.getAllByRole("heading", { name: "Download your data" }).length,
    );
  },
};

export const DownloadStarted: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    download.mockClear();
    const [button] = await canvas.findAllByRole("button", { name: "Download your data" });
    await userEvent.click(button as HTMLElement);
    await expect(download).toHaveBeenCalledTimes(1);
    const [status] = await canvas.findAllByText("Your download has started.");
    await expect(status).toBeDefined();
  },
};
