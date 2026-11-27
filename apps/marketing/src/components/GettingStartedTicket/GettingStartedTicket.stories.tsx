import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { GettingStartedTicket } from "./GettingStartedTicket";

const Demo = () => (
  <div
    className={css({ p: "8", maxWidth: "30rem", mx: "auto", backgroundColor: "surface.canvas" })}
  >
    <GettingStartedTicket />
  </div>
);

const meta: Meta<typeof Demo> = {
  title: "3. Patterns/Marketing/GettingStartedTicket",
  component: Demo,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Demo>;

const assertTicket: Story["play"] = async ({ canvasElement }) => {
  await expect(within(canvasElement).getByTestId("getting-started-ticket")).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertTicket };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertTicket,
};
