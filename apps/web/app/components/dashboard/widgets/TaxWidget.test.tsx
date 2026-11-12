import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaxWidget } from "./TaxWidget";

vi.mock("react-router", () => ({
  useInRouterContext: () => false,
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
  taxYear: "2026/27",
  totalIncome: 12000,
  totalExpenses: 2000,
  netProfit: 10000,
  estimatedTaxDue: null as number | null,
  recordsCount: 5,
};

describe("TaxWidget", () => {
  it("shows 'Not calculated yet' with tabular numerals when tax due is unknown", () => {
    render(<TaxWidget {...baseProps} data={data} />);

    const notCalculated = screen.getByText("Not calculated yet");
    expect(notCalculated).toBeDefined();
    expect(notCalculated.className).toMatch(/tabular-nums/);
    expect(screen.getByRole("link", { name: "Add income" }).getAttribute("href")).toBe("/app/tax");
    expect(screen.queryByText("£0.00")).toBeNull();
    expect(screen.queryByText("£0")).toBeNull();
  });

  it("still shows net profit when that metric is selected", () => {
    render(<TaxWidget {...baseProps} data={data} config={{ metricMode: "netProfit" }} />);

    expect(screen.queryByText("Not calculated yet")).toBeNull();
    expect(screen.getByText(/10,000/)).toBeDefined();
  });

  it("formats a known tax due figure", () => {
    render(<TaxWidget {...baseProps} data={{ ...data, estimatedTaxDue: 2900 }} />);

    expect(screen.getByText(/2,900/)).toBeDefined();
    expect(screen.queryByText("Not calculated yet")).toBeNull();
  });
});
