import { Card } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { TiltLight } from "./TiltLight";

const frame = css({ maxWidth: "sm", p: "8", backgroundColor: "surface.card" });
const text = css({ textStyle: "body.md", color: "text.primary", margin: 0 });

const meta: Meta<typeof TiltLight> = {
  title: "3. Patterns/Marketing/TiltLight",
  component: TiltLight,
  parameters: { layout: "padded" },
  render: () => (
    <div className={frame}>
      <TiltLight data-testid="tilt-card">
        <Card material="glass" padding="lg">
          <p className={text}>
            Move a mouse over this card: the light follows and it tilts a little.
          </p>
        </Card>
      </TiltLight>
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof TiltLight>;

const assertCard: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByTestId("tilt-card")).toBeVisible();
  await expect(canvas.getByText(/the light follows/)).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertCard };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertCard,
};
