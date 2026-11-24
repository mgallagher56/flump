import type { Meta, StoryObj } from "@storybook/react";
import { createRoutesStub, data } from "react-router";
import { expect, fn, userEvent, within } from "storybook/test";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

const loaderSpy = fn();

const withThrow = (kind: string, status: number) => (): React.ReactElement => {
  const Stub = createRoutesStub([
    {
      path: "/",
      loader: () => {
        loaderSpy();
        throw data({ kind }, { status });
      },
      Component: RouteContent,
      ErrorBoundary: RouteErrorBoundary,
    },
  ]);
  return <Stub initialEntries={["/"]} />;
};

/** The root boundary, as root.tsx renders it. */
function RootBoundary() {
  return <RouteErrorBoundary isRoot />;
}

function RouteContent() {
  return <p>Route content</p>;
}

const meta: Meta<typeof RouteErrorBoundary> = {
  title: "3. Patterns/Feedback/RouteErrorBoundary",
  component: RouteErrorBoundary,
  // The Storybook decorator renders every story side by side in Light and Dark by default.
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof RouteErrorBoundary>;

export const Unavailable: Story = {
  render: withThrow("unavailable", 503),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    loaderSpy.mockClear();
    // The side-by-side theme decorator renders the story in each pane, so pick the first button.
    const [retry] = await canvas.findAllByRole("button", { name: "Try again" });
    await userEvent.click(retry);
    await expect(loaderSpy).toHaveBeenCalled();
  },
};

export const NotFound: Story = { render: withThrow("not-found", 404) };

export const Forbidden: Story = { render: withThrow("forbidden", 403) };

export const Unauthorised: Story = { render: withThrow("unauthorised", 401) };

export const Server: Story = { render: withThrow("server", 500) };

/** The root boundary's not-invited page: sign out, contact, and the person's data rights. */
export const NotInvitedAtRoot: Story = {
  render: () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        loader: () => {
          throw data({ kind: "not-invited" }, { status: 403 });
        },
        Component: RouteContent,
        ErrorBoundary: RootBoundary,
      },
    ]);
    return <Stub initialEntries={["/"]} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [download] = await canvas.findAllByRole("heading", { name: "Download your data" });
    await expect(download).toBeDefined();
    const [remove] = canvas.getAllByRole("heading", { name: "Delete your account" });
    await expect(remove).toBeDefined();
  },
};
