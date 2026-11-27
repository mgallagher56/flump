import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, fireEvent, waitFor, within } from "storybook/test";
import { HomePayRise } from "./HomePayRise";

const meta: Meta<typeof HomePayRise> = {
  title: "3. Patterns/Marketing/HomePayRise",
  component: HomePayRise,
  parameters: { layout: "fullscreen" },
  decorators: [
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
  await waitFor(() =>
    expect(canvas.getByTestId("pay-rise-kept-drawn")).toHaveTextContent("£720 a year"),
  );
};

export const Light: Story = { globals: { theme: "light" }, play: assertGlide };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertGlide,
};
