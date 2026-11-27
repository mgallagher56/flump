import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { TicketClose } from "./TicketClose";

const meta: Meta<typeof TicketClose> = {
  title: "3. Patterns/Marketing/TicketClose",
  component: TicketClose,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
  ],
  args: { tone: "card" },
};

export default meta;
type Story = StoryObj<typeof TicketClose>;

const assertClose: Story["play"] = async ({ canvasElement }) => {
  await expect(
    within(canvasElement).getByRole("heading", { name: "Ready to see your own figures?" }),
  ).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertClose };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertClose,
};
