import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent, within } from "@storybook/test";
import { TAX_TRAP_COPY } from "./copy";
import { TaxTrapCalculator } from "./TaxTrapCalculator";

const meta: Meta<typeof TaxTrapCalculator> = {
  title: "3. Calculators/TaxTrapCalculator",
  component: TaxTrapCalculator,
  args: { taxYear: "2026/27", persistSeed: false, onSaveAndContinue: () => {} },
};

export default meta;
type Story = StoryObj<typeof TaxTrapCalculator>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const [table] = canvas.getAllByRole("table", { name: TAX_TRAP_COPY.factsCaption });
  const before = table?.textContent;
  await fireEvent.change(
    canvas.getAllByRole("slider", {
      name: `${TAX_TRAP_COPY.contribution} range slider`,
    })[0] as HTMLElement,
    {
      target: { value: "20000" },
    },
  );
  await expect(table?.textContent).not.toBe(before);
  await expect(canvas.getAllByTestId("tax-trap-childcare-status")[0]).toHaveTextContent(
    "£100,000 or less",
  );
};

export const Default: Story = { play };

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

export const Scotland: Story = { args: { initialRegion: "SCOTLAND" } };

export const NoContribution: Story = { args: { initialContribution: 0 } };
