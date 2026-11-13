import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { PensionWidget, type PensionWidgetProps } from "./PensionWidget";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const data: PensionWidgetProps["data"] = {
  totalPensionBalance: 30000,
  potsCount: 1,
  employeePercent: 0,
  employerPercent: 0,
  isSalarySacrifice: false,
  monthlyContributionEst: 0,
};

const renderWidget = (props: Partial<PensionWidgetProps> = {}) =>
  render(
    <MemoryRouter>
      <PensionWidget data={data} {...props} />
    </MemoryRouter>,
  );

describe("<PensionWidget />", () => {
  it("shows 0% rates as stored", () => {
    renderWidget();
    expect(screen.getByText("0% total contribution")).toBeDefined();
    expect(screen.getAllByText("0%")).toHaveLength(2);
  });

  it("shows no invented rates when the profile has none", () => {
    renderWidget({ data: { ...data, employeePercent: null, employerPercent: null } });
    expect(screen.queryByText(/total contribution/)).toBeNull();
    expect(screen.getByRole("link", { name: "Add contribution rates" }).getAttribute("href")).toBe(
      "/app/pension#pension-details",
    );
  });

  it("labels the backend default 5% + 3% rates", () => {
    renderWidget({ data: { ...data, employeePercent: 5, employerPercent: 3 } });
    expect(screen.getByText(/Default: auto-enrolment minimum/)).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Change in your pension details" }).getAttribute("href"),
    ).toBe("/app/pension#pension-details");
    expect(screen.queryByText(/in profile/i)).toBeNull();
  });

  it("does not label non-default rates", () => {
    renderWidget({ data: { ...data, employeePercent: 6, employerPercent: 4 } });
    expect(screen.queryByText(/Default: auto-enrolment minimum/)).toBeNull();
  });

  it("does not default the retirement age to 65", () => {
    renderWidget();
    expect(screen.queryByText("65")).toBeNull();
    expect(screen.getByText("Target retirement age")).toBeDefined();
    expect(screen.getByText("Not set")).toBeDefined();
    expect(screen.getByRole("link", { name: "Add retirement age" }).getAttribute("href")).toBe(
      "/app/pension",
    );
  });

  it("shows a retirement age the user has chosen", () => {
    renderWidget({ targetRetirementAge: 62 });
    expect(screen.getByText("62")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Add retirement age" })).toBeNull();
  });

  it("keeps the title as the only heading, with the figure in a plain value", () => {
    renderWidget();
    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe("Pension");
    expect(screen.getByText("£30,000")).toBeDefined();
  });
});
