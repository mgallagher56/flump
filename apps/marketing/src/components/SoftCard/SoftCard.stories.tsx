import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { MarketingSection } from "../MarketingSection";
import { SoftCard } from "./SoftCard";

const pad = css({ p: "5", color: "text.primary" });

const Demo = () => (
  <>
    <MarketingSection id="on-card" title="On a card band" tone="card">
      <SoftCard className={pad} radius="panel">
        Enter your salary to see your take-home pay.
      </SoftCard>
    </MarketingSection>
    <MarketingSection id="on-canvas" title="On a canvas band" tone="canvas">
      <SoftCard band="canvas" className={pad} radius="panel">
        Payments on account
      </SoftCard>
    </MarketingSection>
  </>
);

const meta: Meta<typeof Demo> = {
  title: "3. Patterns/Marketing/SoftCard",
  component: Demo,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Demo>;

const assertCards: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Payments on account")).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertCards };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertCards,
};
