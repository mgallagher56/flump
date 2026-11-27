import { textStyles } from "@flump/tokens";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExampleTag } from "./ExampleTag";
import { exampleTagRecipe } from "./ExampleTag.styles";

const remToPx = (rem: string) => Number.parseFloat(rem) * 16;

describe("ExampleTag", () => {
  it('says "Example" as real text in a span', () => {
    render(<ExampleTag />);
    const tag = screen.getByText("Example");
    expect(tag.tagName).toBe("SPAN");
    expect(tag.textContent).toBe("Example");
  });

  it("always says Example, whatever is passed", () => {
    // @ts-expect-error children are not accepted: the approved word is "Example" only.
    render(<ExampleTag>Sample</ExampleTag>);
    expect(screen.getByText("Example").textContent).toBe("Example");
    expect(screen.queryByText("Sample")).toBeNull();
  });

  it("is static text, not a control", () => {
    const { container } = render(<ExampleTag />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector("[tabindex]")).toBeNull();
  });

  it("uses a text style of 12px or larger", () => {
    const style = exampleTagRecipe.raw({}) as { textStyle: string };
    const [group, size] = style.textStyle.split(".") as ["label", "sm"];
    expect(remToPx(textStyles[group][size].value.fontSize)).toBeGreaterThanOrEqual(12);
  });

  it("keeps a real border so it shows in forced colours", () => {
    const style = exampleTagRecipe.raw({}) as Record<string, string>;
    expect(style.borderWidth).toBe("1px");
    expect(style.borderStyle).toBe("solid");
    expect(style.forcedColorAdjust).toBeUndefined();
  });

  it("defaults to the paper variant", () => {
    expect(exampleTagRecipe.raw({})).toEqual(exampleTagRecipe.raw({ variant: "paper" }));
    expect(exampleTagRecipe.raw({}).color).toBe("text.secondary");
  });

  it("uses the off-white text and edge on a contrast card", () => {
    const style = exampleTagRecipe.raw({ variant: "onContrast" });
    expect(style.color).toBe("text.onContrast");
    expect(style.borderColor).toBe("text.onContrast");
    expect(style.backgroundColor).toBe("transparent");
  });

  it("renders different classes per variant and keeps a caller's class", () => {
    const { container } = render(
      <>
        <ExampleTag />
        <ExampleTag variant="paper" />
        <ExampleTag variant="onContrast" />
        <ExampleTag variant="onContrast" className="extra" />
      </>,
    );
    const [plain, paper, onContrast, withExtra] = Array.from(container.children).map(
      (el) => el.className,
    );
    expect(paper).toBe(plain);
    expect(onContrast).not.toBe(paper);
    expect(withExtra).toBe(`${onContrast} extra`);
  });
});
