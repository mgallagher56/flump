import { render, screen } from "@testing-library/react";
import { TrendingUp } from "lucide-react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon";
import { ICON_STROKE_WIDTH } from "./Icon.styles";

describe("Icon", () => {
  it("is aria-hidden when it has no label", () => {
    const { container } = render(<Icon icon={TrendingUp} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("role")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("exposes role img and the label when labelled", () => {
    render(<Icon icon={TrendingUp} label="Trending up" />);
    const img = screen.getByRole("img", { name: "Trending up" });
    expect(img.getAttribute("aria-hidden")).toBeNull();
  });

  it("maps size to 16/20/24 and defaults to 20", () => {
    const { container, rerender } = render(<Icon icon={TrendingUp} size="sm" />);
    expect(container.querySelector("svg")?.getAttribute("width")).toBe("16");
    rerender(<Icon icon={TrendingUp} size="lg" />);
    expect(container.querySelector("svg")?.getAttribute("width")).toBe("24");
    rerender(<Icon icon={TrendingUp} />);
    expect(container.querySelector("svg")?.getAttribute("width")).toBe("20");
  });

  it("uses the token stroke width by default and allows override", () => {
    const { container, rerender } = render(<Icon icon={TrendingUp} />);
    expect(container.querySelector("svg")?.getAttribute("stroke-width")).toBe(
      String(ICON_STROKE_WIDTH),
    );
    rerender(<Icon icon={TrendingUp} strokeWidth={2.5} />);
    expect(container.querySelector("svg")?.getAttribute("stroke-width")).toBe("2.5");
  });

  it("merges a custom className", () => {
    const { container } = render(<Icon icon={TrendingUp} className="extra" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("extra");
  });
});
