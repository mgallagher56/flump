import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { JourneyStop } from "./JourneyStop";
import { JOURNEY_STOPS } from "./journeyStops";

const meta: Meta<typeof JourneyStop> = {
  title: "3. Patterns/Marketing/JourneyStop",
  component: JourneyStop,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <ol>
          <Story />
        </ol>
      </MemoryRouter>
    ),
  ],
  args: { stop: JOURNEY_STOPS[1], index: 1 },
};

export default meta;
type Story = StoryObj<typeof JourneyStop>;

const assertStop: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("article", { name: "Budget and breathing room" })).toBeVisible();
  await expect(canvas.getByRole("link", { name: "About budget in Flump" })).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertStop };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertStop,
};
