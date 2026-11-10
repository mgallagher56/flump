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
});
