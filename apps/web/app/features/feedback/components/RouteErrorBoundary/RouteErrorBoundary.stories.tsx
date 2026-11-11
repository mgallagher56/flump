import type { Meta, StoryObj } from "@storybook/react";
import { createRoutesStub, data } from "react-router";
import { expect, userEvent, within } from "storybook/test";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

const withThrow = (kind: string, status: number) => (): React.ReactElement => {
  const Stub = createRoutesStub([
    {
      path: "/",
      loader: () => {
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
    const buttons = await canvas.findAllByRole("button", { name: "Try again" });
    await expect(buttons.length).toBeGreaterThan(0);
    await userEvent.hover(buttons[0] as HTMLElement);
  },
};

export const NotFound: Story = { render: withThrow("not-found", 404) };

export const Forbidden: Story = { render: withThrow("forbidden", 403) };

export const Unauthorised: Story = { render: withThrow("unauthorised", 401) };
