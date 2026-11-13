import type { Meta, StoryObj } from "@storybook/react";
import { createRoutesStub, data } from "react-router";
import { RouteErrorBoundary } from "../RouteErrorBoundary";
import { ErrorShell } from "./ErrorShell";

const meta: Meta<typeof ErrorShell> = {
  title: "3. Financial Patterns & Sections/ErrorShell",
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

export const NotFoundDocument: Story = { render: () => <Missing /> };
