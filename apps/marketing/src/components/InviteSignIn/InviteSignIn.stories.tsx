import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { MarketingSection } from "../MarketingSection";
import { InviteSignIn } from "./InviteSignIn";

const Demo = () => (
  <>
    <MarketingSection id="on-card" title="On a card band" tone="card">
      <InviteSignIn />
    </MarketingSection>
    <MarketingSection id="on-canvas" title="On a canvas band" tone="canvas">
      <InviteSignIn />
    </MarketingSection>
  </>
);

const meta: Meta<typeof Demo> = {
  title: "3. Patterns/Marketing/InviteSignIn",
  component: Demo,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Demo>;

const assertLine: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const lines = canvas.getAllByTestId("invite-sign-in");
  await expect(lines).toHaveLength(2);
  for (const line of lines) {
    await expect(line).toHaveTextContent("Have an invite link? Sign in.");
    await expect(within(line).getByRole("link", { name: "Sign in" })).toBeVisible();
  }
};

export const Light: Story = { globals: { theme: "light" }, play: assertLine };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertLine,
};
