import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCENARIO_BADGE_TEXT, SCENARIO_RESET_LABEL, ScenarioZone } from "./ScenarioZone";

describe("ScenarioZone", () => {
  it("is a section labelled by its heading, defaulting to 'Model a change'", () => {
    render(<ScenarioZone>content</ScenarioZone>);
    const region = screen.getByRole("region", { name: "Model a change" });
    expect(region.tagName).toBe("SECTION");
    expect(screen.getByRole("heading", { name: "Model a change" })).toBeTruthy();
  });

  it("accepts a custom title and shows the badge, basis and projection notice", () => {
    render(
      <ScenarioZone
        basis="Starting from your figures: £180,000 at 4.5%, 22 years left"
        title="Try it"
      >
        content
      </ScenarioZone>,
    );
    expect(screen.getByRole("region", { name: "Try it" })).toBeTruthy();
    expect(screen.getByText(SCENARIO_BADGE_TEXT)).toBeTruthy();
    expect(screen.getByText(/Starting from your figures/)).toBeTruthy();
    expect(screen.getByTestId("projection-notice")).toBeTruthy();
  });

  it("leaves the notice out when the page already shows it", () => {
    render(<ScenarioZone showNotice={false}>content</ScenarioZone>);
    expect(screen.queryByTestId("projection-notice")).toBeNull();
  });

  it("always shows Reset in the footer, disabled until modified", () => {
    const { rerender } = render(<ScenarioZone onReset={() => {}}>x</ScenarioZone>);
    const reset = screen.getByRole("button", { name: SCENARIO_RESET_LABEL }) as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
    // E16 4.4: the footer holds Reset, "Update your details" and the notice.
    expect(screen.getByTestId("scenario-zone-footer").contains(reset)).toBe(true);
    rerender(
      <ScenarioZone isModified onReset={() => {}}>
        x
      </ScenarioZone>,
    );
    expect(
      (screen.getByRole("button", { name: SCENARIO_RESET_LABEL }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("does not call onReset while nothing has changed", () => {
    const onReset = vi.fn();
    render(<ScenarioZone onReset={onReset}>x</ScenarioZone>);
    fireEvent.click(screen.getByRole("button", { name: SCENARIO_RESET_LABEL }));
    expect(onReset).not.toHaveBeenCalled();
  });

  it("leaves Reset out when there is nothing to reset", () => {
    render(<ScenarioZone isModified>x</ScenarioZone>);
    expect(screen.queryByRole("button", { name: SCENARIO_RESET_LABEL })).toBeNull();
  });

  it("puts Reset, the details link and the one notice in the footer, notice last", () => {
    render(
      <ScenarioZone footer={<a href="/edit">Update your details</a>} onReset={() => {}}>
        x
      </ScenarioZone>,
    );
    const footer = screen.getByTestId("scenario-zone-footer");
    expect(footer.id).toBe("scenario-zone-footer");
    expect(footer.contains(screen.getByRole("link", { name: "Update your details" }))).toBe(true);
    const notices = document.querySelectorAll('[data-notice="projection"]');
    expect(notices).toHaveLength(1);
    expect(footer.lastElementChild).toBe(notices[0]);
  });

  it("accepts a page-supplied notice in place of the default one", () => {
    render(<ScenarioZone notice={<p data-notice="projection">Page notice</p>}>x</ScenarioZone>);
    expect(screen.getByText("Page notice")).toBeTruthy();
    expect(screen.queryByTestId("projection-notice")).toBeNull();
  });

  it("is quieter than a card: no fill (the canvas shows through) and a 1px dashed outline", () => {
    render(<ScenarioZone>x</ScenarioZone>);
    const cls = screen.getByTestId("scenario-zone").className;
    expect(cls).toContain("bg-c_transparent");
    expect(cls).not.toContain("surface.subtle");
    expect(cls).not.toContain("surface.sunken");
    expect(cls).toContain("bd-w_1px");
    expect(cls).toContain("border-style_dashed");
  });

  it("keeps the badge inline with the title", () => {
    render(<ScenarioZone>x</ScenarioZone>);
    const title = screen.getByTestId("scenario-zone-title");
    expect(title.parentElement?.textContent).toContain(SCENARIO_BADGE_TEXT);
  });

  it("calls onReset when Reset is pressed", () => {
    const onReset = vi.fn();
    render(
      <ScenarioZone isModified onReset={onReset}>
        x
      </ScenarioZone>,
    );
    fireEvent.click(screen.getByRole("button", { name: SCENARIO_RESET_LABEL }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("renders the tools, children and footer slots", () => {
    render(
      <ScenarioZone footer={<a href="/edit">Update your details</a>} tools={<div>tool tabs</div>}>
        what-if body
      </ScenarioZone>,
    );
    expect(screen.getByText("tool tabs")).toBeTruthy();
    expect(screen.getByText("what-if body")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Update your details" })).toBeTruthy();
  });

  it("never offers an apply action", () => {
    render(<ScenarioZone isModified>x</ScenarioZone>);
    expect(screen.queryByRole("button", { name: /apply/i })).toBeNull();
  });

  it("exposes the title test id and an optional section id", () => {
    render(<ScenarioZone id="scenario">x</ScenarioZone>);
    expect(screen.getByTestId("scenario-zone-title").textContent).toBe("Model a change");
    expect(screen.getByTestId("scenario-zone").id).toBe("scenario");
  });

  describe("announcement", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("announces changes politely with the Illustration: prefix", () => {
      const { rerender } = render(
        <ScenarioZone announcement="Interest saved £1,000">x</ScenarioZone>,
      );
      rerender(<ScenarioZone announcement="Interest saved £2,000">x</ScenarioZone>);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      const status = screen.getByRole("status");
      expect(status.textContent).toBe("Illustration: Interest saved £2,000");
    });

    it("speaks a non-empty announcement present at mount (pages keep it empty until edited)", () => {
      render(<ScenarioZone announcement="Interest saved £1,000">x</ScenarioZone>);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole("status").textContent).toBe("Illustration: Interest saved £1,000");
    });

    it("speaks the first announcement that follows an empty one", () => {
      const { rerender } = render(<ScenarioZone>x</ScenarioZone>);
      rerender(<ScenarioZone announcement="Interest saved £1,000">x</ScenarioZone>);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole("status").textContent).toBe("Illustration: Interest saved £1,000");
    });
  });
});
