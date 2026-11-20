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
    // The method explainer sits in a closed quiet drawer.
    await expect(
      canvas.getByRole("button", { name: DEBT_SNOWBALL_COPY.explainerTitle }),
    ).toHaveAttribute("aria-expanded", "false");
  },
};

/** Phone width: each debt's fields wrap, so nothing scrolls sideways (known #10). */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const tool = within(canvasElement).getByTestId("debt-snowball-tool");
    await expect(tool.scrollWidth).toBeLessThanOrEqual(tool.clientWidth);
    // Below sm (40em) Edit and Remove sit under the debt name, which keeps the row's width (P75).
    if (window.matchMedia("(max-width: 39.99em)").matches) {
      const legend = canvasElement.querySelector("fieldset legend") as HTMLElement;
      const edit = within(canvasElement).getAllByRole("button", { name: /^Edit debt/ })[0];
      await expect(edit?.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        legend.getBoundingClientRect().bottom - 1,
      );
    }
  },
};

export const MobileDark: Story = { ...Mobile, globals: { theme: "dark" } };

/** Short form on a marketing page: balances and the extra payment first, the rest behind one toggle. */
const shortFormPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.queryByText(DEBT_SNOWBALL_COPY.title)).not.toBeInTheDocument();
  await expect(
    canvas.queryByRole("button", { name: /Continue to sign up/ }),
  ).not.toBeInTheDocument();
  await expect(
    canvas.getByRole("group", { name: "Example debt 1: credit card" }),
  ).toBeInTheDocument();
  await expect(canvas.queryByLabelText(DEBT_SNOWBALL_COPY.rate)).not.toBeInTheDocument();

  const outcomes = within(canvas.getByTestId("debt-snowball-outcomes"));
  await expect(outcomes.getByText("Estimated interest £1,864")).toBeInTheDocument();
  await expect(outcomes.getByText("Estimated interest £2,131")).toBeInTheDocument();

  const toggle = canvas.getByRole("button", { name: DEBT_SNOWBALL_COPY.changeDetails });
  await userEvent.click(toggle);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(canvas.getAllByLabelText(DEBT_SNOWBALL_COPY.rate)).toHaveLength(2);
  await userEvent.click(canvas.getByRole("button", { name: DEBT_SNOWBALL_COPY.add }));
  await expect(canvas.getByRole("group", { name: "Debt 3" })).toBeInTheDocument();
};

export const ShortFormLight: Story = {
  args: { shortForm: true },
  globals: { theme: "light" },
  play: shortFormPlay,
};

export const ShortFormDark: Story = { ...ShortFormLight, globals: { theme: "dark" } };
