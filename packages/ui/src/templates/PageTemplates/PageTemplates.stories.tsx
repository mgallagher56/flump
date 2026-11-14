import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { expectPageRules } from "../../testing";
import {
  DashboardTemplate,
  EmptyTemplate,
  ErrorTemplate,
  FormTemplate,
  ListDetailTemplate,
  PageBody,
  PageSkeleton,
  SimulatorTemplate,
} from "./PageTemplates";

// Axe runs on every story through the preview-level `a11y.test: "error"` setting, in both themes.
const meta: Meta = {
  title: "6. Pages/Templates",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

// The reference each page PR matches: P1 figure budgets, one hero, one projection notice.
const dashboardPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
  await expect(
    canvas.getByRole("figure", { name: "Your net worth this year" }),
  ).toBeInTheDocument();
  await expect(canvas.getByRole("table", { name: "Your accounts" })).toBeInTheDocument();
  await expect(canvas.getByText("£99,629")).toBeInTheDocument();
  // No projection is drawn, so no projection notice.
  expectPageRules(canvasElement, { maxFigures: 10, maxNotSet: 0, projectionNotices: 0 });
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
  expectPageRules(canvasElement, { maxFigures: 12, maxNotSet: 0, projectionNotices: 1 });

  // The scenario zone is lighter than the saved "Your details" card: no shadow, dashed edge.
  const zone = canvas.getByTestId("scenario-zone");
  const details = canvas.getByRole("region", { name: "Your details" });
  await expect(getComputedStyle(zone).boxShadow).toBe("none");
  await expect(getComputedStyle(zone).borderTopStyle).toBe("dashed");
  await expect(getComputedStyle(details).borderTopStyle).toBe("solid");
  await expect(getComputedStyle(zone).backgroundColor).not.toBe(
    getComputedStyle(details).backgroundColor,
  );
  // The one notice sits in the zone footer.
  await expect(
    within(canvas.getByTestId("scenario-zone-footer")).getByRole("note"),
  ).toBeInTheDocument();

  const outcome = canvas.getByTestId("scenario-outcome");
  const before = outcome.textContent;
  await userEvent.click(canvas.getByRole("radio", { name: /Smallest balance first/ }));
  // The strategy runs the real payoff calculation, so the outcome changes.
  await waitFor(() => expect(outcome.textContent).not.toEqual(before));
  const reset = canvas.getByRole("button", { name: "Reset to saved figures" });
  await expect(reset).toBeEnabled();
  await userEvent.click(reset);
  await waitFor(() => expect(outcome.textContent).toEqual(before));
  expectPageRules(canvasElement, { maxFigures: 12, maxNotSet: 0, projectionNotices: 1 });
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
    canvas.getByRole("figure", { name: "Workplace pension this year" }),
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

const pageBodyPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 1, name: "Your money" })).toBeInTheDocument();
  await expect(canvas.getByTestId("page-body")).toBeInTheDocument();
};

const PageBodySample = () => (
  <PageBody data-testid="page-body">
    <h1>Your money</h1>
    <p>Sections sit 32px apart, inside gutters of 16, 24 and 40px, at most 1200px wide.</p>
    <p>Each child of the page body is one section.</p>
  </PageBody>
);

/** P13: the one page wrapper. Resize to 375, md and lg to see the gutters change. */
export const PageBodyLayout: Story = { render: () => <PageBodySample />, play: pageBodyPlay };
export const PageBodyLayoutDark: Story = {
  render: () => <PageBodySample />,
  globals: { theme: "dark" },
  play: pageBodyPlay,
};

const skeletonPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  // Shown after the 200ms delay.
  const status = await canvas.findByRole("status");
  await expect(status).toHaveAttribute("aria-busy", "true");
  await expect(canvas.getAllByTestId("page-skeleton-kpi")).toHaveLength(3);
  await expect(canvas.getAllByTestId("page-skeleton-card")).toHaveLength(2);
};

/** P12.1: what every route shows while its loader is pending beyond 200ms. */
export const Loading: Story = { render: () => <PageSkeleton />, play: skeletonPlay };
export const LoadingDark: Story = {
  render: () => <PageSkeleton />,
  globals: { theme: "dark" },
  play: skeletonPlay,
};
