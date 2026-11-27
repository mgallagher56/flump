import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MomentTimeline } from "../../motion/moments/arrive";
import { CountUpFigure } from "./CountUpFigure";
import { countUpMoment, settleCounts } from "./countUpMoment";
import { figureFormat, formatGbpHundreds, formatMonths } from "./figureFormats";

describe("CountUpFigure", () => {
  it("holds its final value in the server HTML, once for assistive technology and once hidden", () => {
    const html = renderToString(<CountUpFigure format="gbp100" value={232_049} />);
    // 232,049 to the nearest hundred: £232,000
    expect(html.split("£232,000")).toHaveLength(3);
    const { container } = render(<CountUpFigure format="gbp100" value={232_049} />);
    const [said, shown] = Array.from(container.firstElementChild?.children ?? []);
    expect(said?.textContent).toBe("£232,000");
    expect(said?.hasAttribute("aria-hidden")).toBe(false);
    expect(shown?.getAttribute("aria-hidden")).toBe("true");
    expect(shown?.getAttribute("data-count")).toBe("232049");
    expect(shown?.getAttribute("data-count-from")).toBe("0");
    expect(shown?.getAttribute("data-format")).toBe("gbp100");
  });
});

describe("figure formats", () => {
  it("writes en-GB pounds and months", () => {
    expect(formatGbpHundreds(1_249)).toBe("£1,200");
    // 10.24 to one decimal: 10.2
    expect(formatMonths(10.24)).toBe("10.2 months");
    expect(figureFormat("months")(8)).toBe("8 months");
    // An unknown name falls back to whole pounds.
    expect(figureFormat("nope")(1_234.6)).toBe("£1,235");
  });
});

describe("countUpMoment", () => {
  const figure = () => {
    const { container } = render(<CountUpFigure format="gbp" from={100} value={1_000} />);
    return container.querySelector<HTMLElement>("[data-count]") as HTMLElement;
  };

  it("counts the hidden digits from their start to the value on the calm ease, writing each frame", () => {
    const el = figure();
    const fromTo = vi.fn();
    countUpMoment({ fromTo } as unknown as MomentTimeline, el, 0.4, 1.2);
    const [proxy, from, to, at] = fromTo.mock.calls[0] as [
      { v: number },
      { v: number },
      { v: number; duration: number; ease: string; onUpdate: () => void },
      number,
    ];
    expect(from).toEqual({ v: 100 });
    expect(to.v).toBe(1_000);
    expect(to.duration).toBe(1.2);
    expect(to.ease).toBe("calm");
    expect(at).toBe(0.4);
    proxy.v = 550.4;
    to.onUpdate();
    expect(el.textContent).toBe("£550");
  });

  it("does nothing without a figure", () => {
    const fromTo = vi.fn();
    countUpMoment({ fromTo } as unknown as MomentTimeline, null, 0, 1);
    expect(fromTo).not.toHaveBeenCalled();
  });

  it("puts a figure left mid-count back on its final value", () => {
    const el = figure();
    el.textContent = "£12";
    settleCounts(el.parentElement as HTMLElement);
    expect(el.textContent).toBe("£1,000");
  });
});
