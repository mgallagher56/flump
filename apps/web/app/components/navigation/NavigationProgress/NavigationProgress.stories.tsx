import type { Meta, StoryObj } from "@storybook/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, within } from "storybook/test";
import { NavigationProgress } from "./NavigationProgress";

const NoFallback = () => null;

// A loader that never resolves keeps the router in the "loading" state.
const InFlight = () => {
  const router = createMemoryRouter(
    [
      { path: "/", element: <NavigationProgress />, HydrateFallback: NoFallback },
      {
        path: "/slow",
        element: null,
        loader: () => new Promise(() => undefined),
      },
    ],
    { initialEntries: ["/"] },
  );
  void router.navigate("/slow");
  return <RouterProvider router={router} />;
};

const meta: Meta<typeof NavigationProgress> = {
  title: "Navigation/NavigationProgress",
  component: NavigationProgress,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof NavigationProgress>;

export const Loading: Story = {
  render: () => <InFlight />,
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole("progressbar")).toBeInTheDocument();
  },
};

export const LoadingDark: Story = {
  ...Loading,
  globals: { theme: "dark" },
};
