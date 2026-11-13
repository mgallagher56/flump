import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { NotSetValue } from "./NotSetValue";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderIt = (props: Partial<Parameters<typeof NotSetValue>[0]> = {}) =>
  render(
    <MemoryRouter>
      <NotSetValue href="/app/budget" subject="income" {...props} />
    </MemoryRouter>,
  );

describe("NotSetValue", () => {
  it("shows Not set with a named link to where the value is supplied, never a zero", () => {
    renderIt();
    expect(screen.getByText("Not set")).toBeDefined();
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.getByRole("link", { name: "Add income" }).getAttribute("href")).toBe(
      "/app/budget",
    );
  });

  it("accepts a custom label and verb", () => {
    renderIt({ label: "No debts added", actionLabel: "Record", subject: "a debt" });
    expect(screen.getByText("No debts added")).toBeDefined();
    expect(screen.getByRole("link", { name: "Record a debt" })).toBeDefined();
  });
});
