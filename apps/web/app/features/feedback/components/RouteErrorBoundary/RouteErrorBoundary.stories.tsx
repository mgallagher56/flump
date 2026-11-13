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

function RouteContent() {
  return <p>Route content</p>;
}

const meta: Meta<typeof RouteErrorBoundary> = {
  title: "3. Financial Patterns & Sections/RouteErrorBoundary",
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
