import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionBand } from "./SectionBand";

describe("SectionBand Pattern", () => {
  it("renders title, subtitle, and children", () => {
    render(
      <SectionBand
        indexBadge="01"
        subtitle="Designed for British personal finance"
        title="Institutional Financial Planning"
      >
        <div>Band content body</div>
      </SectionBand>,
    );

    expect(screen.getByText("Institutional Financial Planning")).toBeDefined();
    expect(screen.getByText("01")).toBeDefined();
    expect(screen.getByText("Band content body")).toBeDefined();
  });

  it("app variant renders a left-aligned labelled section with a muted description", () => {
    render(
      <SectionBand
        id="stand"
        subtitle="Your figures this month."
        title="Where you stand"
        variant="app"
      >
        <div>Body</div>
      </SectionBand>,
    );
    expect(screen.getByRole("region", { name: "Where you stand" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Where you stand" })).toBeDefined();
    expect(screen.getByText("Your figures this month.")).toBeDefined();
    expect(screen.getByText("Body")).toBeDefined();
  });

  it("defaults to the marketing variant and ignores index badge in the app variant", () => {
    const { rerender } = render(
      <SectionBand indexBadge="01" title="Plan">
        <div>Body</div>
      </SectionBand>,
    );
    expect(screen.getByText("01")).toBeDefined();
    rerender(
      <SectionBand indexBadge="01" title="Plan" variant="app">
        <div>Body</div>
      </SectionBand>,
    );
    expect(screen.queryByText("01")).toBeNull();
  });
});
