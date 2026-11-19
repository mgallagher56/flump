import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SCENARIO_BADGE_TEXT,
  SCENARIO_HIDE_LABEL,
  SCENARIO_RESET_LABEL,
  SCENARIO_SHOW_LABEL,
  ScenarioZone,
} from "./ScenarioZone";

/** Counts how often it mounts, to show a closed zone mounts nothing. */
let toolMounts = 0;
const CountedTool = () => {
  toolMounts += 1;
  return <input aria-label="Extra each month" defaultValue="" />;
};

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

  it("renders its heading at the level it is given", () => {
    render(<ScenarioZone headingAs="h3">content</ScenarioZone>);
    expect(screen.getByRole("heading", { level: 3, name: "Model a change" })).toBeTruthy();
  });

  it("leaves the notice out when the page already shows it", () => {
    render(<ScenarioZone showNotice={false}>content</ScenarioZone>);
    expect(screen.queryByTestId("projection-notice")).toBeNull();
  });

  it("shows Reset in the footer only while something differs from the saved figures", () => {
    const { rerender } = render(<ScenarioZone onReset={() => {}}>x</ScenarioZone>);
    expect(screen.queryByRole("button", { name: SCENARIO_RESET_LABEL })).toBeNull();
    rerender(
      <ScenarioZone isModified onReset={() => {}}>
        x
      </ScenarioZone>,
    );
    const reset = screen.getByRole("button", { name: SCENARIO_RESET_LABEL });
    // E16 4.4: the footer holds Reset, "Update your details" and the notice.
    expect(screen.getByTestId("scenario-zone-footer").contains(reset)).toBe(true);
  });

  it("resets, then moves focus to the zone heading as the button goes away", () => {
    const onReset = vi.fn();
    render(
      <ScenarioZone isModified onReset={onReset} title="Model a change">
        x
      </ScenarioZone>,
    );
    fireEvent.click(screen.getByRole("button", { name: SCENARIO_RESET_LABEL }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByTestId("scenario-zone-title"));
  });

  it("pulls a leading ghost footer action back to the zone's edge, so it is not indented", () => {
    render(
      <ScenarioZone
        footer={
          <button data-variant="ghost" type="button">
            Update
          </button>
        }
        onReset={() => {}}
      >
        x
      </ScenarioZone>,
    );
    const actions = screen.getByRole("button", { name: "Update" }).parentElement as HTMLElement;
    expect(actions.className).toContain("[&_>_[data-variant='ghost']:first-child]:ms_-4");
  });

  it("styles the footer's details link as a teal standalone link (B5), never black bold text", () => {
    render(
      <ScenarioZone
        footer={
          <button data-variant="ghost" type="button">
            Update your details
          </button>
        }
        onReset={() => {}}
      >
        x
      </ScenarioZone>,
    );
    const actions = screen.getByRole("button", { name: "Update your details" })
      .parentElement as HTMLElement;
    // B5 standalone link: primary (teal), weight 600, no underline.
    expect(actions.className).toMatch(/\]:c_primary\b/);
    expect(actions.className).toMatch(/\]:fw_semibold\b/);
    expect(actions.className).toMatch(/\]:td_none\b|\]:text-decor_none\b/);
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

  it("draws the outline in border.input so it can be seen on the canvas (E17 5A)", () => {
    render(<ScenarioZone>x</ScenarioZone>);
    expect(screen.getByTestId("scenario-zone").className).toContain("bd-c_border.input");
  });

  it("puts the result beside the inputs, and further options under both", () => {
    render(
      <ScenarioZone extra={<div data-testid="more">More</div>} result={<div>Result card</div>}>
        <div>Inputs</div>
      </ScenarioZone>,
    );
    const split = screen.getByTestId("scenario-zone-split");
    expect(split.textContent).toBe("InputsResult card");
    expect(screen.getByTestId("scenario-zone-result").textContent).toBe("Result card");
    expect(split.className).toContain("md:grid-tc_minmax(0,_5fr)_minmax(0,_7fr)");
    // The drawer follows the split, so opening it never pushes the result away from its inputs.
    expect(split.compareDocumentPosition(screen.getByTestId("more"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("has no split when there is no result", () => {
    render(<ScenarioZone>x</ScenarioZone>);
    expect(screen.queryByTestId("scenario-zone-split")).toBeNull();
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

  describe("collapsible", () => {
    const zone = (props: Partial<Parameters<typeof ScenarioZone>[0]> = {}) => (
      <ScenarioZone
        basis="Starting from your saved plan."
        collapsible
        showLabel="Show what-if: change your plan"
        summary="Starts from your pot of £50,000."
        {...props}
      >
        <p>Tool inputs</p>
      </ScenarioZone>
    );

    it("mounts its tools on first open, not before, and keeps them mounted after closing", () => {
      toolMounts = 0;
      render(
        <ScenarioZone basis="Basis" collapsible showLabel="Show what-if">
          <CountedTool />
        </ScenarioZone>,
      );
      // Closed: nothing mounted, so a closed zone runs no effects.
      expect(toolMounts).toBe(0);
      expect(screen.queryByLabelText("Extra each month")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Show what-if" }));
      const input = screen.getByLabelText("Extra each month") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "200" } });
      fireEvent.click(screen.getByRole("button", { name: "Hide what-if" }));
      fireEvent.click(screen.getByRole("button", { name: "Show what-if" }));
      // Still the same input, with what was typed.
      expect((screen.getByLabelText("Extra each month") as HTMLInputElement).value).toBe("200");
    });

    it("is not collapsible by default: no disclosure button, content shown", () => {
      render(<ScenarioZone basis="Basis">Tool inputs</ScenarioZone>);
      expect(screen.queryByTestId("scenario-zone-toggle")).toBeNull();
      expect(screen.getByText("Tool inputs")).toBeTruthy();
    });

    it("starts closed with its title, badge, summary and a labelled disclosure button", () => {
      render(zone());
      expect(screen.getByRole("heading", { name: "Model a change" })).toBeTruthy();
      expect(screen.getByText(SCENARIO_BADGE_TEXT)).toBeTruthy();
      expect(screen.getByTestId("scenario-zone-summary").textContent).toBe(
        "Starts from your pot of £50,000.",
      );
      expect(screen.queryByText("Starting from your saved plan.")).toBeNull();
      expect(screen.queryByText("Tool inputs")).toBeNull();
      expect(screen.queryByTestId("projection-notice")).toBeNull();
      const button = screen.getByRole("button", { name: "Show what-if: change your plan" });
      expect(button.getAttribute("aria-expanded")).toBe("false");
      const panel = document.getElementById(button.getAttribute("aria-controls") ?? "");
      expect(panel).not.toBeNull();
      expect(panel?.hidden).toBe(true);
    });

    it("opens and closes from the disclosure button", () => {
      render(zone());
      fireEvent.click(screen.getByRole("button", { name: "Show what-if: change your plan" }));
      const hide = screen.getByRole("button", { name: SCENARIO_HIDE_LABEL });
      expect(hide.getAttribute("aria-expanded")).toBe("true");
      expect(screen.getByText("Tool inputs")).toBeTruthy();
      // Open, the header shows the basis line, not the summary.
      expect(screen.getByText("Starting from your saved plan.")).toBeTruthy();
      expect(screen.queryByTestId("scenario-zone-summary")).toBeNull();
      expect(screen.getByTestId("projection-notice")).toBeTruthy();
      const panel = document.getElementById(hide.getAttribute("aria-controls") ?? "");
      expect(panel?.hidden).toBe(false);
      fireEvent.click(hide);
      // Closed again, the tools stay mounted but hidden, so nothing typed is lost.
      expect(panel?.hidden).toBe(true);
      expect(screen.getByRole("button", { name: "Show what-if: change your plan" })).toBeTruthy();
    });

    it("can start open, and falls back to the basis and default labels", () => {
      render(
        <ScenarioZone basis="Starting from your saved plan." collapsible defaultOpen>
          <p>Tool inputs</p>
        </ScenarioZone>,
      );
      expect(screen.getByText("Tool inputs")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: SCENARIO_HIDE_LABEL }));
      expect(screen.getByRole("button", { name: SCENARIO_SHOW_LABEL })).toBeTruthy();
      expect(screen.getByTestId("scenario-zone-summary").textContent).toBe(
        "Starting from your saved plan.",
      );
    });

    it("follows a controlled open prop and reports presses", () => {
      const onOpenChange = vi.fn();
      const { rerender } = render(zone({ open: false, onOpenChange }));
      fireEvent.click(screen.getByRole("button", { name: "Show what-if: change your plan" }));
      expect(onOpenChange).toHaveBeenCalledWith(true);
      // Still closed until the page passes open.
      expect(screen.queryByText("Tool inputs")).toBeNull();
      rerender(zone({ open: true, onOpenChange }));
      expect(screen.getByText("Tool inputs")).toBeTruthy();
    });
  });
});
