import type { Meta, StoryObj } from "@storybook/react";
import { useContext } from "react";
import { expect, within } from "storybook/test";
import { StorybookRouterContext } from "../../../../.storybook/react-router-mock";
import { NavigationProgress } from "./NavigationProgress";

// The Storybook router mock has no data router; it reports the navigation state from context.
const InFlight = () => (
  <StorybookRouterContext.Provider
    value={{ ...useContext(StorybookRouterContext), navigationState: "loading" }}
  >
    <NavigationProgress />
  </StorybookRouterContext.Provider>
);

const meta: Meta<typeof NavigationProgress> = {
  title: "3. Patterns/Navigation/NavigationProgress",
  component: NavigationProgress,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof NavigationProgress>;

export const Loading: Story = {
  render: () => <InFlight />,
  play: async ({ canvasElement }) => {
    const bars = await within(canvasElement).findAllByRole("progressbar");
    await expect(bars[0]).toBeInTheDocument();
  },
};

export const LoadingDark: Story = {
  ...Loading,
  globals: { theme: "dark" },
};
