import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { AmbientMotionProvider } from "../../context/AmbientMotionContext";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { HomeJourney } from "./HomeJourney";

const meta: Meta<typeof HomeJourney> = {
  title: "3. Patterns/Marketing/HomeJourney",
  component: HomeJourney,
  parameters: { layout: "fullscreen" },
  decorators: [
    // The rest state, as with reduced motion: the plain list a reader sees without motion.
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
    (Story) => (
      <MemoryRouter>
        <AmbientMotionProvider>
          <Story />
        </AmbientMotionProvider>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HomeJourney>;

const assertJourney: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 2, name: "From rough figures to one picture" }),
  ).toBeVisible();
  await expect(canvas.getAllByRole("heading", { level: 2 })).toHaveLength(7);
  await expect(canvas.getByText("6 of 6")).toBeVisible();
  await expect(canvas.getByRole("link", { name: "Interactive preview" })).toBeVisible();
  await expect(canvas.getByTestId("home-journey").getAttribute("data-live")).toBe("off");
};

export const Light: Story = { globals: { theme: "light" }, play: assertJourney };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertJourney,
};
