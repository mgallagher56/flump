import { BUSINESS_DETAILS } from "@flump/business-details";
import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { ContactPage } from "./ContactPage";

const meta: Meta<typeof ContactPage> = {
  title: "Marketing/ContactPage",
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
  const invite = canvas.getByRole("link", { name: "Email for an invite" });
  await expect(invite.getAttribute("href")).toBe(
    `mailto:${BUSINESS_DETAILS.supportEmail.value}?subject=Flump%20beta%20invite%20request`,
  );
  await expect(canvasElement.querySelector("#beta")).not.toBeNull();
};

export const Light: Story = { play: assertPage };

export const Dark: Story = {
  globals: { theme: "dark" },
  play: assertPage,
};
