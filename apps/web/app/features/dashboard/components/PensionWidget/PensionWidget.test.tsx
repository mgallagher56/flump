import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { PensionWidget, type PensionWidgetProps } from "./PensionWidget";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const data: PensionWidgetProps["data"] = {
  totalPensionBalance: 30000,
  potsCount: 2,
  employeePercent: 5,
  employerPercent: 3,
};

const renderWidget = (props: PensionWidgetProps) =>
  render(
    <MemoryRouter>
      <PensionWidget {...props} />
    </MemoryRouter>,
  );

describe("PensionWidget", () => {
  it("shows the pots total when the strip does not", () => {
    renderWidget({ data });
    expect(screen.getByText("£30,000")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows the contribution rate when the strip already has the pot", () => {
    renderWidget({ data, potInStrip: true });
    expect(screen.queryByText("£30,000")).toBeNull();
    expect(screen.getByText("8%")).toBeTruthy();
  });

  it('reads "Not set" when the rates are not saved', () => {
    renderWidget({ data: { ...data, employeePercent: null }, potInStrip: true });
    expect(screen.getByText("Not set")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Add contribution rates/ })).toBeTruthy();
  });
});
