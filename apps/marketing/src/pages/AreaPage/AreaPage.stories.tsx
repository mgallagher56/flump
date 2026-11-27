import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, userEvent, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { MONEY_AREAS } from "../../utils/featureAreas";
import { AreaPage } from "./AreaPage";

const [accounts, , pay, savings, debt] = MONEY_AREAS;

const meta: Meta<typeof AreaPage> = {
  title: "6. Pages/Marketing/AreaPage",
  component: AreaPage,
  decorators: [
    // The rest state, as with reduced motion: axe checks what a reader sees once a moment ends.
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
    (Story) => (
      <HelmetProvider>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </HelmetProvider>
    ),
  ],
  parameters: { layout: "fullscreen" },
  args: { feature: accounts },
};

export default meta;
type Story = StoryObj<typeof AreaPage>;

const assertAccounts: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "Accounts and net worth" }),
  ).toBeVisible();
  await expect(canvas.getByRole("link", { current: "page", name: /Accounts/ })).toBeVisible();
  // The sample switches household, as on the preview page.
  const homeowner = canvas.getByRole("button", { name: "Paying a mortgage" });
  await userEvent.click(homeowner);
  await expect(homeowner).toHaveAttribute("aria-pressed", "true");
};

export const Light: Story = { globals: { theme: "light" }, play: assertAccounts };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertAccounts,
};

const assertSavings: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "Savings and pension" }),
  ).toBeVisible();
};

export const SavingsLight: Story = {
  args: { feature: savings },
  globals: { theme: "light" },
  play: assertSavings,
};

export const SavingsDark: Story = {
  args: { feature: savings },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertSavings,
};

const assertPay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "Take-home pay and Self Assessment" }),
  ).toBeVisible();
  // The set piece: the journey's payslip, tagged as an example.
  await expect(canvas.getByTestId("area-set-piece")).toBeVisible();
  await expect(canvas.getByRole("link", { current: "page", name: /Pay/ })).toBeVisible();
};

export const PayLight: Story = {
  args: { feature: pay },
  globals: { theme: "light" },
  play: assertPay,
};

export const PayDark: Story = {
  args: { feature: pay },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPay,
};

const assertDebt: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 1, name: "Debt and borrowing" })).toBeVisible();
  await expect(canvas.getByRole("heading", { name: "Try it with your own numbers" })).toBeVisible();
};

export const DebtLight: Story = {
  args: { feature: debt },
  globals: { theme: "light" },
  play: assertDebt,
};

export const DebtDark: Story = {
  args: { feature: debt },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertDebt,
};
