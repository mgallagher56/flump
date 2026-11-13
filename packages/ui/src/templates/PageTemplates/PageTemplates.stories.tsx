import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import {
  DashboardTemplate,
  EmptyTemplate,
  ErrorTemplate,
  FormTemplate,
  ListDetailTemplate,
  SimulatorTemplate,
} from "./PageTemplates";

const meta: Meta = {
  title: "4. Page Templates/Templates",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Dashboard: Story = {
  render: () => <DashboardTemplate />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    await expect(canvas.getByRole("figure")).toBeInTheDocument();
    await expect(canvas.getByRole("table", { name: "Your accounts" })).toBeInTheDocument();
  },
};

export const Simulator: Story = {
  render: () => <SimulatorTemplate />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Debt payoff" }),
    ).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("radio", { name: /Snowball/ }));
    await expect(canvas.getByRole("radio", { name: /Snowball/ })).toBeChecked();
  },
};

export const Form: Story = {
  render: () => <FormTemplate />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByRole("textbox", { name: /Account name/ }),
      "Easy-access saver",
    );
    await expect(canvas.getByRole("textbox", { name: /Account name/ })).toHaveValue(
      "Easy-access saver",
    );
    await userEvent.click(canvas.getByRole("checkbox", { name: /Include in my net worth/ }));
    await expect(canvas.getByText("Enter a balance, or leave it for later.")).toBeInTheDocument();
  },
};

export const ListDetail: Story = {
  render: () => <ListDetailTemplate />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Workplace pension/ }));
    await expect(canvas.getByRole("button", { name: /Workplace pension/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Workplace pension" }),
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {
  render: () => <EmptyTemplate />,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("heading", { name: "No accounts yet" }),
    ).toBeInTheDocument();
  },
};

export const ErrorPage: Story = {
  render: () => <ErrorTemplate />,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "Back to home" }),
    ).toBeInTheDocument();
  },
};
