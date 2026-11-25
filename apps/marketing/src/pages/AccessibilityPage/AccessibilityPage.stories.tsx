import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { AccessibilityPage } from "./AccessibilityPage";

const meta: Meta<typeof AccessibilityPage> = {
  title: "6. Pages/Marketing/AccessibilityPage",
  component: AccessibilityPage,
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
type Story = StoryObj<typeof AccessibilityPage>;

const assertPage: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "Accessibility statement" }),
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
