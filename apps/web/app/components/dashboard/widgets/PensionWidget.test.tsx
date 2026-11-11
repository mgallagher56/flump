import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PensionWidget } from "./PensionWidget";

const noop = vi.fn();
const baseProps = {
  editMode: false,
  size: "normal" as const,
  onHide: noop,
  onMoveDown: noop,
  onMoveUp: noop,
  onToggleSize: noop,
};
const data = {
  totalPensionBalance: 30000,
  potsCount: 1,
  employeePercent: 0,
  employerPercent: 0,
  isSalarySacrifice: false,
  monthlyContributionEst: 0,
};

describe("PensionWidget", () => {
  it("shows 0% rates as stored", () => {
    render(<PensionWidget {...baseProps} data={data} />);
    expect(screen.getByText("0% total contribution")).toBeTruthy();
  });

  it("shows no invented rates when the profile has none", () => {
    render(
      <PensionWidget
        {...baseProps}
        data={{ ...data, employeePercent: null, employerPercent: null }}
      />,
    );
    expect(screen.queryByText(/total contribution/)).toBeNull();
    expect(screen.getByText("Contribution rates not set")).toBeTruthy();
  });
});
