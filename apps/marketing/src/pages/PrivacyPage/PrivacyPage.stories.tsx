import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { PrivacyPage } from "./PrivacyPage";

const meta: Meta<typeof PrivacyPage> = {
  title: "6. Pages/Marketing/PrivacyPage",
  component: PrivacyPage,
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
};

export default meta;
type Story = StoryObj<typeof PrivacyPage>;

const assertPage: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "Privacy notice" }),
  ).toBeInTheDocument();
  await expect(canvas.getByTestId("legal-version")).toHaveTextContent("Version");
  await expect(canvas.getByTestId("legal-review-note")).toHaveTextContent(
    "A solicitor has not reviewed this page.",
  );
};

export const Light: Story = { globals: { theme: "light" }, play: assertPage };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPage,
};
