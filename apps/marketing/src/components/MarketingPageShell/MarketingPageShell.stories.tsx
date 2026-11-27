import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { BubbleField } from "../BubbleField";
import { MotionControl } from "../MotionControl";
import { MarketingPageShell } from "./MarketingPageShell";

const band = css({ position: "relative", minHeight: "320px", p: "8" });
const text = css({ textStyle: "body.lg", color: "text.primary", margin: 0 });

const meta: Meta<typeof MarketingPageShell> = {
  title: "3. Patterns/Marketing/MarketingPageShell",
  component: MarketingPageShell,
  parameters: { layout: "fullscreen" },
  render: () => (
    <MarketingPageShell>
      <main className={band}>
        <BubbleField layout="a" />
        <p className={text}>Any marketing page: the bubbles pause with the control.</p>
        <MotionControl />
      </main>
    </MarketingPageShell>
  ),
};

export default meta;
type Story = StoryObj<typeof MarketingPageShell>;

const assertShell: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("main")).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertShell };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertShell,
};
