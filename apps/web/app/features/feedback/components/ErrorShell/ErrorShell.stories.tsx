import type { Meta, StoryObj } from "@storybook/react";
import { createRoutesStub, data } from "react-router";
import { expect, within } from "storybook/test";
import { RouteErrorBoundary } from "../RouteErrorBoundary";
import { ErrorShell } from "./ErrorShell";

const meta: Meta<typeof ErrorShell> = {
  title: "Feedback/ErrorShell",
  component: ErrorShell,
  // The Storybook decorator renders every story side by side in Light and Dark by default.
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof ErrorShell>;

const Empty = (): null => null;

const DocumentBoundary = (): React.ReactElement => (
  <ErrorShell>
    <RouteErrorBoundary headingLevel="h1" />
  </ErrorShell>
);

const Missing = (): React.ReactElement => {
  const Stub = createRoutesStub([
    {
      path: "/",
      loader: () => {
        throw data({ kind: "not-found" }, { status: 404 });
      },
      Component: Empty,
      ErrorBoundary: DocumentBoundary,
    },
  ]);
  return <Stub initialEntries={["/"]} />;
};

export const NotFoundDocument: Story = {
  render: () => <Missing />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The side-by-side theme decorator renders the story in each pane, so check the first one.
    const [skip] = await canvas.findAllByRole("link", { name: "Skip to content" });
    await expect(skip.getAttribute("href")).toBe("#main-content");
    const [heading] = await canvas.findAllByRole("heading", {
      level: 1,
      name: "We couldn't find that",
    });
    await expect(heading).toBeVisible();
    const [main] = canvas.getAllByRole("main");
    await expect(main.contains(heading)).toBe(true);
  },
};
