import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaxYearBar } from "./TaxYearBar";

describe("TaxYearBar", () => {
  it("shows the selected year and selects another", () => {
    const onSelectYear = vi.fn();
    render(
      <TaxYearBar
        years={["2025/26", "2026/27"]}
        selectedYear="2026/27"
        onSelectYear={onSelectYear}
      />,
    );
    const select = screen.getByLabelText("Tax year") as HTMLSelectElement;
    expect(select.value).toBe("2026/27");
    fireEvent.change(select, { target: { value: "2025/26" } });
    expect(onSelectYear).toHaveBeenCalledWith("2025/26");
  });

  it("is a select, not a row of buttons", () => {
    render(<TaxYearBar years={["2026/27"]} selectedYear="2026/27" onSelectYear={vi.fn()} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
