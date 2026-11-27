import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketingBand } from "./MarketingBand";

describe("MarketingBand", () => {
  it("is a section labelled by its heading, marked as a named stop", () => {
    render(
      <MarketingBand bubbles="a" id="pay-rise" stop="Pay rise" title="What you keep" tone="canvas">
        <p>Body</p>
      </MarketingBand>,
    );
    const section = screen.getByRole("region", { name: "What you keep" });
    expect(section.id).toBe("pay-rise");
    expect(section.getAttribute("aria-labelledby")).toBe("pay-rise-title");
    expect(section.hasAttribute("data-home-section")).toBe(true);
    expect(section.getAttribute("data-home-section-name")).toBe("Pay rise");
    expect(section.hasAttribute("data-home-section-line")).toBe(false);
    expect(section.querySelector("[data-bubble-field]")?.getAttribute("data-bubble-field")).toBe(
      "a",
    );
  });

  it("is no stop and has no bubbles unless asked, and passes a stop's own line", () => {
    const { container, rerender } = render(
      <MarketingBand id="plain" title="Plain">
        <p>Body</p>
      </MarketingBand>,
    );
    expect(container.querySelector("[data-home-section]")).toBeNull();
    expect(container.querySelector("[data-bubble-field]")).toBeNull();
    rerender(
      <MarketingBand id="plain" stop="Plain" stopLine={0} title="Plain">
        <p>Body</p>
      </MarketingBand>,
    );
    expect(container.querySelector("section")?.getAttribute("data-home-section-line")).toBe("0");
  });
});
