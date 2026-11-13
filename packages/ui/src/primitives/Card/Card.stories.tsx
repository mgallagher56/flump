import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Card } from "./Card";

const row = css({ display: "flex", gap: "4", flexWrap: "wrap" });

const meta: Meta<typeof Card> = {
  title: "2. Primitives/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  args: {
    children: "SIPP & Workplace Pension Overview",
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Resting: Story = {
  args: {
    elevation: "resting",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("SIPP & Workplace Pension Overview").length).toBeGreaterThan(
      0,
    );
  },
};

export const Interactive: Story = {
  args: {
    elevation: "interactive",
  },
};

export const Floating: Story = {
  args: {
    elevation: "floating",
  },
};

const Surfaces = () => (
  <div className={row}>
    <Card as="section" surface="default">
      Default card
    </Card>
    <Card as="section" surface="subtle">
      Subtle card
    </Card>
    <Card as="section" surface="sunken">
      Sunken card
    </Card>
  </div>
);

const surfacesPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Sunken card").tagName).toBe("SECTION");
};

export const Light: Story = {
  globals: { theme: "light" },
  render: () => <Surfaces />,
  play: surfacesPlay,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => <Surfaces />,
  play: surfacesPlay,
};

export const Padding: Story = {
  render: () => (
    <div className={row}>
      {(["sm", "md", "lg"] as const).map((padding) => (
        <Card key={padding} padding={padding}>
          Padding {padding}
        </Card>
      ))}
    </div>
  ),
};
