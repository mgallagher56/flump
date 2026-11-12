import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Button } from "../Button/Button";
import { Money, Num } from "./Money";

const grid = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "4",
  alignItems: "baseline",
  backgroundColor: "surface.card",
  color: "text.primary",
  padding: "4",
  borderRadius: "lg",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
});

const caption = css({ textStyle: "label.sm", color: "text.secondary" });

const Gallery = () => (
  <div className={grid}>
    <span className={caption}>kpi</span>
    <Money size="kpi" value={1234567} />
    <span className={caption}>lg</span>
    <Money size="lg" value={42850} />
    <span className={caption}>md with pence</span>
    <Money fractionDigits={2} size="md" value={1234.5} />
    <span className={caption}>sm negative</span>
    <Money size="sm" value={-1234} />
    <span className={caption}>always sign, positive tone</span>
    <Money signDisplay="always" tone="positive" value={240} />
    <span className={caption}>danger tone</span>
    <Money signDisplay="always" tone="danger" value={-4200} />
    <span className={caption}>real zero</span>
    <Money value={0} />
    <span className={caption}>unknown</span>
    <Money value={null} />
    <span className={caption}>unknown with action</span>
    <Money notSetAction={<Button size="sm">Add balance</Button>} value={undefined} />
    <span className={caption}>percent</span>
    <Num fractionDigits={1} kind="percent" value={4.5} />
    <span className={caption}>number</span>
    <Num value={1250000} />
    <span className={caption}>unknown number</span>
    <Num value={Number.NaN} />
  </div>
);

const meta: Meta<typeof Money> = {
  title: "2. Primitives/Money",
  component: Money,
  parameters: { layout: "padded" },
  render: () => <Gallery />,
};

export default meta;
type Story = StoryObj<typeof Money>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("£1,234,567")).toBeInTheDocument();
  await expect(canvas.getByText("£0")).toBeInTheDocument();
  await expect(canvas.getByText("minus £1,234")).toBeInTheDocument();
  await expect(canvas.getAllByText("Not set")).toHaveLength(3);
  await expect(canvas.getByRole("button", { name: "Add balance" })).toBeInTheDocument();
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
