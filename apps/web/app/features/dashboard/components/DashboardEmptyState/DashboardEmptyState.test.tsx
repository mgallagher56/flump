import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { DashboardEmptyState } from "./DashboardEmptyState";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

describe("<DashboardEmptyState />", () => {
  it("offers setup next actions when nothing is configured", () => {
    render(
      <MemoryRouter>
        <DashboardEmptyState reason="setup" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Build your dashboard" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Add an account" }).getAttribute("href")).toBe(
      "/app/accounts",
    );
    expect(screen.getByRole("link", { name: "Add your budget" })).toBeDefined();
  });

  it("offers to reopen the checklist when every widget is hidden", () => {
    const onChooseWidgets = vi.fn();
    render(
      <MemoryRouter>
        <DashboardEmptyState reason="hidden" onChooseWidgets={onChooseWidgets} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show or hide widgets" }));
    expect(onChooseWidgets).toHaveBeenCalledOnce();
  });
});
