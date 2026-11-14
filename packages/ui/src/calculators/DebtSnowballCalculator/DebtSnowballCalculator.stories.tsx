import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { DEBT_SNOWBALL_COPY, DebtSnowballCalculator } from "./DebtSnowballCalculator";

const meta: Meta<typeof DebtSnowballCalculator> = {
  title: "5. Calculators/DebtSnowballCalculator",
  component: DebtSnowballCalculator,
  parameters: { layout: "padded" },
  args: { onSaveAndContinue: fn(), persistSeed: false },
};

export default meta;
type Story = StoryObj<typeof DebtSnowballCalculator>;

const play: Story["play"] = async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  const outcomes = within(canvas.getByTestId("debt-snowball-outcomes"));
  // The examples are ordered differently by the two methods, so they give different answers.
  await expect(outcomes.getByText("£1,864")).toBeInTheDocument();
  await expect(outcomes.getByText("£2,131")).toBeInTheDocument();

  // Rate and minimum sit behind Edit.
  const edit = canvas.getByRole("button", { name: DEBT_SNOWBALL_COPY.editLabel(1) });
  await userEvent.click(edit);
  await expect(edit).toHaveAttribute("aria-expanded", "true");

  // Typing in the extra payment pill recalculates both methods.
  const extra = canvas.getByLabelText(`${DEBT_SNOWBALL_COPY.extra} input`);
  await userEvent.clear(extra);
  await userEvent.type(extra, "0");
  await userEvent.tab();
  await expect(outcomes.queryByText("£1,864")).not.toBeInTheDocument();

  await userEvent.click(canvas.getByRole("button", { name: /Continue to sign up/ }));
  await expect(args.onSaveAndContinue).toHaveBeenCalledWith(
    expect.objectContaining({ totalUnsecuredDebt: 6000 }),
  );
};

export const Default: Story = { play };

export const Light: Story = { ...Default, globals: { theme: "light" } };

export const Dark: Story = { ...Default, globals: { theme: "dark" } };

/** On a tool page: the page shows the title, so the calculator leaves out its own. */
export const Embedded: Story = {
  args: { embedded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(DEBT_SNOWBALL_COPY.title)).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("heading", { level: 2, name: DEBT_SNOWBALL_COPY.explainerTitle }),
    ).toBeInTheDocument();
  },
};

/** Phone width: each debt's fields wrap, so nothing scrolls sideways (known #10). */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const tool = within(canvasElement).getByTestId("debt-snowball-tool");
    await expect(tool.scrollWidth).toBeLessThanOrEqual(tool.clientWidth);
  },
};
