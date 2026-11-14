import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketingSection } from "./MarketingSection";

describe("MarketingSection", () => {
  it("labels the section with its h2", () => {
    render(
      <MarketingSection id="example" subtitle="One line." title="A section" tone="sage">
        <p>Body</p>
      </MarketingSection>,
    );
    const section = screen.getByRole("region", { name: "A section" });
    expect(section.getAttribute("id")).toBe("example");
    expect(section.getAttribute("data-tone-band")).toBe("sage");
    expect(screen.getByRole("heading", { level: 2, name: "A section" })).toBeDefined();
    expect(screen.getByText("One line.")).toBeDefined();
  });

  it("renders no heading when no title is given", () => {
    render(
      <MarketingSection id="plain">
        <p>Body</p>
      </MarketingSection>,
    );
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("Body")).toBeDefined();
  });
});
