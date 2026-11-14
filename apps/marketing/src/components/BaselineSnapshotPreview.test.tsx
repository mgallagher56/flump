import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BaselineSnapshotPreview, BREAKDOWN } from "./BaselineSnapshotPreview";

const pounds = (s: string) => Number(s.replace(/[£,]/g, ""));

describe("BaselineSnapshotPreview", () => {
  it("splits the £4,400 take-home into parts that add up, with matching percentages", () => {
    const total = BREAKDOWN.reduce((sum, p) => sum + pounds(p.amount), 0);
    expect(total).toBe(4400);
    expect(BREAKDOWN.reduce((sum, p) => sum + p.pct, 0)).toBe(100);
    for (const part of BREAKDOWN) {
      expect(Math.round((pounds(part.amount) / 4400) * 100)).toBe(part.pct);
    }
  });

  it("agrees with the headline figures (£195 a week, +£840 a month)", () => {
    const safe = BREAKDOWN.find((p) => p.key === "safe");
    const surplus = BREAKDOWN.find((p) => p.key === "surplus");
    expect(pounds(safe?.amount ?? "")).toBe(Math.round((195 * 52) / 12));
    expect(pounds(surplus?.amount ?? "")).toBe(840);
  });

  it("uses semantic colour tokens only, no primitive scale tokens", () => {
    const { container } = render(<BaselineSnapshotPreview />);
    expect(container.innerHTML).not.toMatch(
      /--colors-(success|info|slate|destructive)-|--colors-text-muted|rgba\(/,
    );
  });
});
