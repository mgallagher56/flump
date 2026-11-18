import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { equityShareSubline, HomeEquityLine } from "./HomeEquityLine";

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

  it("shows the equity at the user's share when the home and mortgage share match", () => {
    // 350,000 x 40 / 100 - 125,000 x 40 / 100 = 140,000 - 50,000 = 90,000.
    render(
      <HomeEquityLine
        homeSharePercent={40}
        homeValue={350_000}
        mortgageBalance={125_000}
        mortgageSharePercent={40}
      />,
    );
    const line = screen.getByTestId("home-equity-line");
    expect(line.textContent).toContain("£90,000");
    expect(line.textContent).toContain("At your 40% share");
  });

  it("takes each side at its own share when they differ", () => {
    // Sole home, 50% mortgage: 300,000 - 200,000 x 50 / 100 = 300,000 - 100,000 = 200,000.
    render(
      <HomeEquityLine
        homeSharePercent={null}
        homeValue={300_000}
        mortgageBalance={200_000}
        mortgageSharePercent={50}
      />,
    );
    const line = screen.getByTestId("home-equity-line");
    expect(line.textContent).toContain("£200,000");
    expect(line.textContent).toContain("At your share of the home and of the mortgage");
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

describe("equityShareSubline", () => {
  it("names one share when both match below 100, and none when sole", () => {
    expect(equityShareSubline(50, 50, true)).toBe("At your 50% share");
    expect(equityShareSubline(null, null, true)).toBeNull();
    expect(equityShareSubline(100, null, true)).toBeNull();
  });

  it("uses the home share alone when there is no mortgage", () => {
    expect(equityShareSubline(50, null, false)).toBe("At your 50% share");
    expect(equityShareSubline(null, 50, false)).toBeNull();
  });

  it("says both shares when they differ", () => {
    expect(equityShareSubline(100, 50, true)).toBe("At your share of the home and of the mortgage");
  });
});
