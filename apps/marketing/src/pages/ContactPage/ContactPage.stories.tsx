import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { ContactPage } from "./ContactPage";

const meta: Meta<typeof ContactPage> = {
  title: "6. Pages/Marketing/ContactPage",
  component: ContactPage,
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
type Story = StoryObj<typeof ContactPage>;

const assertPage: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "Contact Flump" }),
  ).toBeInTheDocument();
  await expect(
    within(canvas.getByRole("main")).queryByRole("link", { name: "Request an invite" }),
  ).toBeNull();
  await expect(canvasElement.querySelector("#beta")).not.toBeNull();
};

export const Light: Story = { globals: { theme: "light" }, play: assertPage };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPage,
};
