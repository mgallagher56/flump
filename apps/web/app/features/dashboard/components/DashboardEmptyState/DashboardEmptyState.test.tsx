import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { DashboardEmptyState } from "./DashboardEmptyState";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

describe("<DashboardEmptyState />", () => {
  it("offers one next action when nothing is configured", () => {
    render(
      <MemoryRouter>
        <DashboardEmptyState reason="setup" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Nothing to show yet" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Add an account" }).getAttribute("href")).toBe(
      "/app/accounts",
    );
    // One button per empty state (copy guide 5.5).
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("offers to reopen the checklist when every section is hidden", () => {
    const onChooseWidgets = vi.fn();
    render(
      <MemoryRouter>
        <DashboardEmptyState reason="hidden" onChooseWidgets={onChooseWidgets} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose what shows here" }));
    expect(onChooseWidgets).toHaveBeenCalledOnce();
  });
});
