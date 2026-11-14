import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaxRatesStatusBanner } from "./TaxRatesStatusBanner";

describe("TaxRatesStatusBanner", () => {
  it("renders nothing when the rates match the calendar", () => {
    const { container } = render(
      <TaxRatesStatusBanner calendarYear="2026/27" ratesYear="2026/27" isFallback={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("says which rates are used when falling back", () => {
    render(<TaxRatesStatusBanner calendarYear="2027/28" ratesYear="2026/27" isFallback />);
    expect(screen.getByRole("status").textContent).toContain("Using 2026/27 rates");
    expect(screen.getByRole("status").textContent).toContain("2027/28 rates are not in Flump yet");
  });

  it("shows the provisional wording", () => {
    render(
      <TaxRatesStatusBanner
        calendarYear="2027/28"
        ratesYear="2027/28"
        isFallback={false}
        kind="provisional"
      />,
    );
    expect(screen.getByRole("status").textContent).toContain("provisional");
  });

  it("can be dismissed", () => {
    render(<TaxRatesStatusBanner calendarYear="2027/28" ratesYear="2026/27" isFallback />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
