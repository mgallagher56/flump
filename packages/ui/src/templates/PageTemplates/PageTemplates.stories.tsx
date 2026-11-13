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

// Axe runs on every story through the preview-level `a11y.test: "error"` setting, in both themes.
const meta: Meta = {
  title: "4. Page Templates/Templates",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

const dashboardPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
  await expect(
    canvas.getByRole("figure", { name: "Your net worth over the past year (sample data)" }),
  ).toBeInTheDocument();
  await expect(canvas.getByRole("table", { name: "Your accounts" })).toBeInTheDocument();
  await expect(canvas.getAllByText("£99,629.43").length).toBeGreaterThan(0);
};

export const Dashboard: Story = { render: () => <DashboardTemplate />, play: dashboardPlay };
export const DashboardDark: Story = {
  render: () => <DashboardTemplate />,
  globals: { theme: "dark" },
  play: dashboardPlay,
};

const simulatorPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 1, name: "Debt payoff" })).toBeInTheDocument();
  const before = canvas.getByRole("figure").textContent;
  await userEvent.click(canvas.getByRole("radio", { name: /Snowball/ }));
  await expect(canvas.getByRole("radio", { name: /Snowball/ })).toBeChecked();
  // The strategy runs the real payoff engine, so the chart summary changes.
  await expect(canvas.getByRole("figure").textContent).not.toEqual(before);
};

export const Simulator: Story = { render: () => <SimulatorTemplate />, play: simulatorPlay };
export const SimulatorDark: Story = {
  render: () => <SimulatorTemplate />,
  globals: { theme: "dark" },
  play: simulatorPlay,
};

const formPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const error = "Enter a balance, or leave it for later.";
  await expect(canvas.queryByText(error)).toBeNull();
  await userEvent.click(canvas.getByRole("button", { name: "Save account" }));
  await expect(canvas.getByText(error)).toBeInTheDocument();
  await userEvent.type(canvas.getByRole("textbox", { name: /Current balance/ }), "1200");
  await expect(canvas.queryByText(error)).toBeNull();
};

export const Form: Story = { render: () => <FormTemplate />, play: formPlay };
export const FormDark: Story = {
  render: () => <FormTemplate />,
  globals: { theme: "dark" },
  play: formPlay,
};

const listDetailPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole("button", { name: /Workplace pension/ }));
  await expect(canvas.getByRole("button", { name: /Workplace pension/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(
    canvas.getByRole("heading", { level: 2, name: "Workplace pension" }),
  ).toBeInTheDocument();
  await expect(
    canvas.getByRole("figure", { name: "Workplace pension (sample data)" }),
  ).toBeInTheDocument();
};

export const ListDetail: Story = { render: () => <ListDetailTemplate />, play: listDetailPlay };
export const ListDetailDark: Story = {
  render: () => <ListDetailTemplate />,
  globals: { theme: "dark" },
  play: listDetailPlay,
};

const emptyPlay: Story["play"] = async ({ canvasElement }) => {
  await expect(
    within(canvasElement).getByRole("heading", { name: "No accounts yet" }),
  ).toBeInTheDocument();
};

export const Empty: Story = { render: () => <EmptyTemplate />, play: emptyPlay };
export const EmptyDark: Story = {
  render: () => <EmptyTemplate />,
  globals: { theme: "dark" },
  play: emptyPlay,
};

export const ErrorPage: Story = {
  render: () => <ErrorTemplate />,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "Back to home" }),
    ).toBeInTheDocument();
  },
};
