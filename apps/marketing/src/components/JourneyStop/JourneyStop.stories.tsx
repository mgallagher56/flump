import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { JourneyStop } from "./JourneyStop";
import { JOURNEY_STOPS } from "./journeyStops";

const meta: Meta<typeof JourneyStop> = {
  title: "3. Patterns/Marketing/JourneyStop",
  component: JourneyStop,
  parameters: { layout: "fullscreen" },
  decorators: [
    // The rest state, as with reduced motion: axe checks what a reader sees once a moment ends.
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: { stop: JOURNEY_STOPS[1], index: 1, total: JOURNEY_STOPS.length, live: false },
};

export default meta;
type Story = StoryObj<typeof JourneyStop>;

const assertStop: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("region", { name: "Budget and breathing room" })).toBeVisible();
  await expect(canvas.getByText("2 of 6")).toBeVisible();
  await expect(canvas.getByRole("link", { name: "About budget in Flump" })).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertStop };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertStop,
};

const assertLast: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("link", { name: "Request an invite" })).toBeVisible();
  await expect(canvas.getByRole("link", { name: "Interactive preview" })).toBeVisible();
};

export const LastStopLight: Story = {
  args: { stop: JOURNEY_STOPS[5], index: 5 },
  globals: { theme: "light" },
  play: assertLast,
};

export const LastStopDark: Story = {
  args: { stop: JOURNEY_STOPS[5], index: 5 },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertLast,
};
