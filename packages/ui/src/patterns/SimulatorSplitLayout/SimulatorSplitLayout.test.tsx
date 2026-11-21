import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SimulatorSplitLayout } from "./SimulatorSplitLayout";

describe("SimulatorSplitLayout Pattern", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders sticky left controls and right visual content", () => {
    render(
      <SimulatorSplitLayout
        content={<div>Visual Area Chart</div>}
        controls={<div>Slider Parameters</div>}
      />,
    );
    expect(screen.getByText("Slider Parameters")).toBeDefined();
    expect(screen.getByText("Visual Area Chart")).toBeDefined();
  });

  it("renders no main landmark", () => {
    render(<SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />);
    expect(screen.queryByRole("main")).toBeNull();
  });

  it("labels both regions with defaults", () => {
    render(<SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />);
    expect(screen.getByRole("region", { name: "Parameters" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Results" })).toBeDefined();
  });

  it("accepts custom region labels", () => {
    render(
      <SimulatorSplitLayout
        content={<div>Chart</div>}
        contentLabel="Payoff outcome"
        controls={<div>Controls</div>}
        controlsLabel="Payoff inputs"
      />,
    );
    expect(screen.getByRole("region", { name: "Payoff inputs" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Payoff outcome" })).toBeDefined();
  });

  it("uses a 5/7 split by default and 4/8 when asked", () => {
    const { rerender } = render(
      <SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />,
    );
    expect(screen.getByRole("region", { name: "Parameters" }).className).toContain(
      "lg:grid-c_span_5",
    );
    expect(screen.getByRole("region", { name: "Results" }).className).toContain("lg:grid-c_span_7");
    rerender(
      <SimulatorSplitLayout
        content={<div>Chart</div>}
        controls={<div>Controls</div>}
        controlsSpan={4}
      />,
    );
    expect(screen.getByRole("region", { name: "Parameters" }).className).toContain(
      "lg:grid-c_span_4",
    );
    expect(screen.getByRole("region", { name: "Results" }).className).toContain("lg:grid-c_span_8");
  });

  it("makes the controls sticky from lg", () => {
    render(<SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />);
    expect(screen.getByRole("region", { name: "Parameters" }).className).toContain("lg:pos_sticky");
  });

  it("never caps the sticky column's height or scrolls it on its own (no clipped cards)", () => {
    render(<SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />);
    const className = screen.getByRole("region", { name: "Parameters" }).className;
    expect(className).not.toMatch(/max-h_/);
    expect(className).not.toMatch(/ov(-y)?_(auto|scroll|hidden)/);
  });

  it("shows the summary and an Adjust disclosure wired with aria-expanded and aria-controls", () => {
    render(
      <SimulatorSplitLayout
        content={<div>Chart</div>}
        controls={<div>Controls</div>}
        summary={<span>Debt free in 3 years</span>}
      />,
    );
    expect(screen.getByText("Debt free in 3 years")).toBeDefined();
    const adjust = screen.getByRole("button", { name: "Adjust" });
    expect(adjust.getAttribute("aria-expanded")).toBe("false");
    const controls = screen.getByRole("region", { name: "Parameters" });
    expect(adjust.getAttribute("aria-controls")).toBe(controls.id);

    fireEvent.click(adjust);
    expect(adjust.getAttribute("aria-expanded")).toBe("true");
    // The outcome stays rendered while the controls are open.
    expect(screen.getByText("Debt free in 3 years")).toBeDefined();
    expect(screen.getByText("Chart")).toBeDefined();
    fireEvent.click(adjust);
    expect(adjust.getAttribute("aria-expanded")).toBe("false");
  });

  it("without a summary: no Adjust control and the controls are never collapsed", () => {
    render(<SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />);
    expect(screen.queryByRole("button", { name: "Adjust" })).toBeNull();
    expect(screen.queryByTestId("simulator-summary-bar")).toBeNull();
    const controls = screen.getByRole("region", { name: "Parameters" });
    // Visible at every width: no responsive display:none on the controls.
    expect(controls.className).not.toContain("d_none");
    // Controls come before the results in the DOM (stacked above the content).
    const results = screen.getByRole("region", { name: "Results" });
    expect(
      controls.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("with a summary the controls collapse under lg", () => {
    render(
      <SimulatorSplitLayout
        content={<div>Chart</div>}
        controls={<div>Controls</div>}
        summary="Outcome"
      />,
    );
    expect(screen.getByRole("region", { name: "Parameters" }).className).toContain("d_none");
  });

  describe("sticky only when the column fits the viewport", () => {
    const renderWithHeight = (height: number) => {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        () => ({ height }) as DOMRect,
      );
      return render(
        <SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />,
      );
    };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("stays sticky when the column fits below the header", () => {
      vi.stubGlobal("innerHeight", 900);
      renderWithHeight(600);
      const region = screen.getByRole("region", { name: "Parameters" });
      expect(region.dataset.sticky).toBe("true");
      expect(region.className).toContain("lg:pos_sticky");
    });

    it("scrolls with the page when the column is taller than the viewport", () => {
      vi.stubGlobal("innerHeight", 700);
      renderWithHeight(1200);
      const region = screen.getByRole("region", { name: "Parameters" });
      expect(region.dataset.sticky).toBe("false");
      expect(region.className).not.toContain("lg:pos_sticky");
    });

    it("subtracts --app-header-offset from the space available", () => {
      vi.stubGlobal("innerHeight", 700);
      document.documentElement.style.setProperty("--app-header-offset", "120px");
      try {
        renderWithHeight(600);
        expect(screen.getByRole("region", { name: "Parameters" }).dataset.sticky).toBe("false");
      } finally {
        document.documentElement.style.removeProperty("--app-header-offset");
      }
    });

    it("re-measures when the window is resized", () => {
      vi.stubGlobal("innerHeight", 700);
      renderWithHeight(800);
      const region = screen.getByRole("region", { name: "Parameters" });
      expect(region.dataset.sticky).toBe("false");
      vi.stubGlobal("innerHeight", 1000);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
      expect(region.dataset.sticky).toBe("true");
    });
  });

  it("offsets both sticky elements by --app-header-offset", () => {
    render(
      <SimulatorSplitLayout
        content={<div>Chart</div>}
        controls={<div>Controls</div>}
        summary="Outcome"
      />,
    );
    expect(screen.getByTestId("simulator-summary-bar").className).toContain("app-header-offset");
    expect(screen.getByRole("region", { name: "Parameters" }).className).toContain(
      "app-header-offset",
    );
  });

  it("supports a custom Adjust label", () => {
    render(
      <SimulatorSplitLayout
        adjustLabel="Change inputs"
        summary="Outcome"
        content={<div>Chart</div>}
        controls={<div>Controls</div>}
      />,
    );
    expect(screen.getByRole("button", { name: "Change inputs" })).toBeDefined();
  });

  it("hands the reveal to renderControlsContainer under lg (Sheet swap-in point)", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(
      <SimulatorSplitLayout
        content={<div>Chart</div>}
        controls={<div>Controls</div>}
        summary="Outcome"
        renderControlsContainer={({ open, id, label, children }) => (
          <div aria-label={label} data-open={String(open)} id={id} role="dialog">
            {children}
          </div>
        )}
      />,
    );
    const container = screen.getByRole("dialog", { name: "Parameters" });
    expect(container.getAttribute("data-open")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Adjust" }));
    expect(container.getAttribute("data-open")).toBe("true");
  });

  it("keeps the inline controls from lg even with renderControlsContainer", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(
      <SimulatorSplitLayout
        content={<div>Chart</div>}
        controls={<div>Controls</div>}
        summary="Outcome"
        renderControlsContainer={() => <div role="dialog">Sheet</div>}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("region", { name: "Parameters" })).toBeDefined();
  });
});

describe("SimulatorSplitLayout layout switching and measuring", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const sheet = ({
    open,
    id,
    label,
    children,
  }: {
    open: boolean;
    id: string;
    label: string;
    children: React.ReactNode;
  }) => (
    <div aria-label={label} data-open={String(open)} id={id} role="dialog">
      {children}
    </div>
  );

  const layout = (extra: Partial<React.ComponentProps<typeof SimulatorSplitLayout>> = {}) => (
    <SimulatorSplitLayout
      content={<div>Chart</div>}
      controls={<div>Controls</div>}
      summary="Outcome"
      renderControlsContainer={sheet}
      {...extra}
    />
  );

  /** A matchMedia stand-in whose answer the test can change, telling listeners as a browser would. */
  const stubMedia = (initial: boolean) => {
    let matches = initial;
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", () => ({
      get matches() {
        return matches;
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }));
    return {
      set: (next: boolean) => {
        matches = next;
        act(() => {
          for (const fn of listeners) fn();
        });
      },
      listeners,
    };
  };

  it("moves the controls into the custom container when the screen narrows, and back", () => {
    const media = stubMedia(true);
    const { unmount } = render(layout());
    expect(screen.queryByRole("dialog")).toBeNull();
    media.set(false);
    expect(screen.getByRole("dialog", { name: "Parameters" })).toBeDefined();
    media.set(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it("treats a browser without matchMedia as wide, keeping the controls inline", () => {
    vi.stubGlobal("matchMedia", undefined);
    render(layout());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("region", { name: "Parameters" })).toBeDefined();
  });

  it("renders the controls inline on the server, before any screen width is known", () => {
    const html = renderToString(layout());
    expect(html).toContain('aria-label="Parameters"');
    expect(html).not.toContain('role="dialog"');
  });

  it("keeps the controls inline under lg when no custom container is given", () => {
    stubMedia(false);
    render(layout({ renderControlsContainer: undefined }));
    expect(screen.getByRole("region", { name: "Parameters" })).toBeDefined();
  });

  it("shows no summary bar for a null or false summary", () => {
    const { rerender } = render(layout({ summary: null }));
    expect(screen.queryByRole("button", { name: "Adjust" })).toBeNull();
    rerender(layout({ summary: false }));
    expect(screen.queryByRole("button", { name: "Adjust" })).toBeNull();
  });

  it("points Adjust at the custom container only while it is open", () => {
    stubMedia(false);
    render(layout());
    const adjust = screen.getByRole("button", { name: "Adjust" });
    expect(adjust.getAttribute("aria-controls")).toBeNull();
    fireEvent.click(adjust);
    expect(adjust.getAttribute("aria-controls")).toBe(screen.getByRole("dialog").id);
  });

  describe("fit at the edges", () => {
    const renderWithHeight = (height: number) => {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        () => ({ height }) as DOMRect,
      );
      return render(
        <SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />,
      );
    };

    it("keeps a 16px gap below the header: a column 8px short of the full height scrolls", () => {
      // 700 tall window, no header offset, 16px gap: 684px available, so a 692px column does not fit.
      vi.stubGlobal("innerHeight", 700);
      renderWithHeight(692);
      expect(screen.getByRole("region", { name: "Parameters" }).dataset.sticky).toBe("false");
    });

    it("stays sticky for a column exactly as tall as the space available", () => {
      // 716 - 0 - 16 = 700px available; a 700px column fits exactly.
      vi.stubGlobal("innerHeight", 716);
      renderWithHeight(700);
      expect(screen.getByRole("region", { name: "Parameters" }).dataset.sticky).toBe("true");
    });

    it("re-measures when the column itself resizes", () => {
      let callback: (() => void) | undefined;
      const disconnect = vi.fn();
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(fn: () => void) {
            callback = fn;
          }
          observe() {}
          disconnect = disconnect;
        },
      );
      vi.stubGlobal("innerHeight", 700);
      let height = 1200;
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        () => ({ height }) as DOMRect,
      );
      const { unmount } = render(
        <SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />,
      );
      const region = screen.getByRole("region", { name: "Parameters" });
      expect(region.dataset.sticky).toBe("false");
      height = 400;
      act(() => callback?.());
      expect(region.dataset.sticky).toBe("true");
      unmount();
      expect(disconnect).toHaveBeenCalled();
    });
  });
});
