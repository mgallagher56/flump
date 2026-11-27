import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { JourneySample } from "./JourneySample";

const column = css({ display: "grid", gap: "6", maxWidth: "560px" });

const STOPS = [
  "accounts",
  "budget",
  "pay",
  "savings-and-pension",
  "debt-and-borrowing",
  "picture",
] as const;

/** All six samples, one below the other, at a sample column's width. */
const AllSamples = () => (
  <div className={column}>
    {STOPS.map((stop) => (
      <JourneySample key={stop} stop={stop} />
    ))}
  </div>
);

const meta: Meta<typeof AllSamples> = {
  title: "3. Patterns/Marketing/JourneySample",
  component: AllSamples,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof AllSamples>;

const assertSamples: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByText("Example")).toHaveLength(6);
  await expect(canvas.getByRole("article", { name: "Example payslip" })).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertSamples };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertSamples,
};
