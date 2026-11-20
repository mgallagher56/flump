import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { FeatureTiles } from "./FeatureTiles";

const meta: Meta<typeof FeatureTiles> = {
  title: "3. Patterns/Marketing/FeatureTiles",
  component: FeatureTiles,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: { headingLevel: 3 },
};

export default meta;
type Story = StoryObj<typeof FeatureTiles>;

const assertTiles: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("link")).toHaveLength(6);
  await expect(canvas.getByRole("link", { name: "AI connection" })).toHaveAttribute(
    "href",
    "/features/ai-connection",
  );
};

export const Light: Story = { globals: { theme: "light" }, play: assertTiles };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertTiles,
};
