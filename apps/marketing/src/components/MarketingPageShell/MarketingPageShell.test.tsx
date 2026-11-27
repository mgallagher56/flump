import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MotionControl } from "../MotionControl";
import { MarketingPageShell } from "./MarketingPageShell";

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.ambient;
});

describe("MarketingPageShell", () => {
  it("wraps the page in one column and gives any page the pause control's context", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { container } = render(
      <MarketingPageShell>
        <main>Page</main>
        <MotionControl />
      </MarketingPageShell>,
    );
    expect(container.querySelector("[data-page-shell] > main")?.textContent).toBe("Page");
    act(() => fireEvent.click(screen.getByRole("button", { name: "Pause animation" })));
    expect(document.documentElement.dataset.ambient).toBe("paused");
  });
});
