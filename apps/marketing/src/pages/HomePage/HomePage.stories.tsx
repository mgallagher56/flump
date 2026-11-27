import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { HomePage } from "./HomePage";

const meta: Meta<typeof HomePage> = {
  title: "6. Pages/Marketing/HomePage",
  component: HomePage,
  parameters: { layout: "fullscreen" },
  decorators: [
    // The rest state, as with reduced motion: axe checks what a reader sees once a moment ends.
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
    (Story) => (
      <HelmetProvider>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </HelmetProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HomePage>;

const assertHome: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "All your money. One clear picture." }),
  ).toBeVisible();
  const main = within(canvas.getByRole("main"));
  // Three by design (prototype 11): the hero's, the journey's last stop's and the close's.
  await expect(main.getAllByRole("link", { name: "Request an invite" })).toHaveLength(3);
};

export const Light: Story = { globals: { theme: "light" }, play: assertHome };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertHome,
};
