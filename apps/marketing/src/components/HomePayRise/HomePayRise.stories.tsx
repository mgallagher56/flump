import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, fireEvent, waitFor, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { HomePayRise } from "./HomePayRise";

const meta: Meta<typeof HomePayRise> = {
  title: "3. Patterns/Marketing/HomePayRise",
  component: HomePayRise,
  parameters: { layout: "fullscreen" },
  decorators: [
    // The rest state, as with reduced motion: axe checks what a reader sees once a moment ends.
    // The glide on input (useGlide) still plays.
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
};

export default meta;
type Story = StoryObj<typeof HomePayRise>;

/** The result glides to its new value on input, and settles on it. */
const assertGlide: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByTestId("pay-rise-kept-drawn")).toHaveTextContent("£1,440 a year");
  fireEvent.change(canvas.getByLabelText("Pay rise (a year)"), { target: { value: "1000" } });
  // A screen reader gets the new value at once (MK10); the drawn digits glide to it.
  const spoken = canvas.getByTestId("pay-rise-kept-drawn").previousElementSibling;
  await expect(spoken).toHaveTextContent("£720 a year");
  // The glide is durations.marketing.glide (588 ms), but a busy test browser may throttle frames.
  await waitFor(
    () => expect(canvas.getByTestId("pay-rise-kept-drawn")).toHaveTextContent("£720 a year"),
    { timeout: 5000 },
  );
};

export const Light: Story = { globals: { theme: "light" }, play: assertGlide };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertGlide,
};
