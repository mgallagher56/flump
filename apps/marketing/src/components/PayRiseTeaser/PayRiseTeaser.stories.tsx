import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, fireEvent, within } from "storybook/test";
import { PayRiseTeaser } from "./PayRiseTeaser";

const meta: Meta<typeof PayRiseTeaser> = {
  title: "Marketing/PayRiseTeaser",
  component: PayRiseTeaser,
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
type Story = StoryObj<typeof PayRiseTeaser>;

const assertTeaser: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("£1,440 a year")).toBeInTheDocument();
  fireEvent.change(canvas.getByLabelText("Pay rise (a year)"), {
    target: { value: "1000" },
  });
  await expect(canvas.getByText("£720 a year")).toBeInTheDocument();
};

export const Light: Story = { globals: { theme: "light" }, play: assertTeaser };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertTeaser,
};

const assertTaper: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  fireEvent.change(canvas.getByLabelText("Current salary (before tax)"), {
    target: { value: "99500" },
  });
  await expect(canvas.getByTestId("pay-rise-taper-note")).toBeInTheDocument();
};

/** A visitor's own salary inside the taper band shows the factual note. */
export const TaperBandReached: Story = { globals: { theme: "light" }, play: assertTaper };

export const TaperBandReachedDark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertTaper,
};
