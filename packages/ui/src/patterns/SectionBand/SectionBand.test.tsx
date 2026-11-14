import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionBand, type SectionBandTone } from "./SectionBand";

describe("SectionBand", () => {
  it("labels a marketing band with its h2 and marks its tone", () => {
    render(
      <SectionBand id="example" subtitle="One line." title="A section" tone="sage">
        <p>Body</p>
      </SectionBand>,
    );
    const section = screen.getByRole("region", { name: "A section" });
    expect(section.getAttribute("id")).toBe("example");
    expect(section.getAttribute("data-tone-band")).toBe("sage");
    expect(screen.getByRole("heading", { level: 2, name: "A section" })).toBeDefined();
    expect(screen.getByText("One line.")).toBeDefined();
    expect(screen.getByText("Body")).toBeDefined();
  });

  it.each<SectionBandTone>(["canvas", "subtle", "sage", "apricot"])(
    "renders the %s tone",
    (tone) => {
      render(
        <SectionBand id={`band-${tone}`} title={`Band ${tone}`} tone={tone}>
          <p>Body</p>
        </SectionBand>,
      );
      expect(
        screen.getByRole("region", { name: `Band ${tone}` }).getAttribute("data-tone-band"),
      ).toBe(tone);
    },
  );

  it("uses a heading inside the children as the label when there is no title", () => {
    render(
      <SectionBand id="plain" labelledBy="inner">
        <h2 id="inner">Inner heading</h2>
      </SectionBand>,
    );
    expect(screen.getByRole("region", { name: "Inner heading" })).toBeDefined();
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
    const section = screen.getByRole("region", { name: "Where you stand" });
    expect(section.hasAttribute("data-tone-band")).toBe(false);
    expect(screen.getByRole("heading", { level: 2, name: "Where you stand" })).toBeDefined();
    expect(screen.getByText("Your figures this month.")).toBeDefined();
  });
});
