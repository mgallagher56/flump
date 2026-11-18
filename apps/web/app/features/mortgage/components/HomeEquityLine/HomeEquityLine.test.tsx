import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeEquityLine } from "./HomeEquityLine";

describe("<HomeEquityLine />", () => {
  it("shows nothing until a home value is known", () => {
    const { container } = render(<HomeEquityLine homeValue={null} mortgageBalance={100_000} />);
    expect(container.textContent).toBe("");
  });

  it("shows value less mortgage for a sole home, with no share line", () => {
    // 300,000 - 200,000 = 100,000.
    render(<HomeEquityLine homeValue={300_000} mortgageBalance={200_000} />);
    const line = screen.getByTestId("home-equity-line");
    expect(line.textContent).toContain("Your equity");
    expect(line.textContent).toContain("£100,000");
    expect(line.textContent).not.toMatch(/share/);
  });

  it("shows the equity at the user's share when joint", () => {
    // (350,000 - 125,000) x 40 / 100 = 90,000.
    render(<HomeEquityLine homeValue={350_000} mortgageBalance={125_000} sharePercent={40} />);
    const line = screen.getByTestId("home-equity-line");
    expect(line.textContent).toContain("£90,000");
    expect(line.textContent).toContain("At your 40% share");
  });

  it("shows the whole value when there is no mortgage", () => {
    render(<HomeEquityLine homeValue={275_000} />);
    expect(screen.getByTestId("home-equity-line").textContent).toContain("£275,000");
  });

  it("shows negative equity with a minus sign and no judging words", () => {
    // 180,000 - 195,000 = -15,000.
    render(<HomeEquityLine homeValue={180_000} mortgageBalance={195_000} />);
    const line = screen.getByTestId("home-equity-line");
    expect(line.textContent).toContain("-£15,000");
    expect(line.textContent).not.toMatch(/negative|warning|underwater/i);
  });
});
