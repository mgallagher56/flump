import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, userEvent, within } from "storybook/test";
import { MONEY_AREAS } from "../../utils/featureAreas";
import { FeaturePage } from "./FeaturePage";

const [accounts, , , savings] = MONEY_AREAS;

const meta: Meta<typeof FeaturePage> = {
  title: "6. Pages/Marketing/FeaturePage",
  component: FeaturePage,
  decorators: [
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
type Story = StoryObj<typeof FeaturePage>;

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

export const WithoutSampleLight: Story = {
  args: { feature: savings },
  globals: { theme: "light" },
  play: assertSavings,
};

export const WithoutSampleDark: Story = {
  args: { feature: savings },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertSavings,
};
