import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketingPageShell } from "./MarketingPageShell";

describe("MarketingPageShell", () => {
  it("wraps the page in one column", () => {
    const { container } = render(
      <MarketingPageShell>
        <main>Page</main>
      </MarketingPageShell>,
    );
    expect(container.querySelector("[data-page-shell] > main")?.textContent).toBe("Page");
  });
});
