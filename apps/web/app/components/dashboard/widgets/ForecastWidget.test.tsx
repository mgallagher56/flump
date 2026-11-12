import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ForecastWidget } from "./ForecastWidget";

vi.mock("react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

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
  totalAssets: 60000,
  monthlySavingRate: 500,
  annualSalary: null as number | null,
  estimatedTakeHome: null as number | null,
};

describe("ForecastWidget take-home", () => {
  it("shows 'Not set' with tabular numerals when take-home is unknown", () => {
    render(<ForecastWidget {...baseProps} data={data} />);

    const notSet = screen.getByText("Not set");
    expect(notSet.className).toMatch(/tabular-nums/);
  });

  it("shows the monthly figure when take-home is known", () => {
    render(<ForecastWidget {...baseProps} data={{ ...data, estimatedTakeHome: 3200 }} />);

    expect(screen.getByText(/3,200/)).toBeDefined();
    expect(screen.queryByText("Not set")).toBeNull();
  });
});
