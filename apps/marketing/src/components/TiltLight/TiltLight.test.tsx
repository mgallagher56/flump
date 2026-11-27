import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TiltLight } from "./TiltLight";

const stubMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

const mouseMove = (element: Element) =>
  act(() => {
    element.dispatchEvent(
      new PointerEvent("pointermove", { pointerType: "mouse", clientX: 10, clientY: 10 }),
    );
  });

afterEach(() => vi.unstubAllGlobals());

describe("TiltLight", () => {
  it("renders a list item or a div with its data attributes", () => {
    stubMotion(false);
    const { container } = render(
      <ul>
        <TiltLight as="li" data-feature="pay">
          Card
        </TiltLight>
      </ul>,
    );
    const item = container.querySelector("li");
    expect(item?.getAttribute("data-feature")).toBe("pay");
    const { container: plain } = render(<TiltLight>Card</TiltLight>);
    expect(plain.firstElementChild?.tagName).toBe("DIV");
  });

  it("turns the light on under a mouse pointer", () => {
    stubMotion(false);
    const { container } = render(<TiltLight data-testid="tilt">Card</TiltLight>);
    const element = container.firstElementChild as HTMLElement;
    mouseMove(element);
    expect(element.dataset.tiltLight).toBe("on");
  });

  it("stays still with reduced motion", () => {
    stubMotion(true);
    const { container } = render(<TiltLight>Card</TiltLight>);
    const element = container.firstElementChild as HTMLElement;
    mouseMove(element);
    expect(element.dataset.tiltLight).toBeUndefined();
  });

  it("writes no inline style in the server HTML", () => {
    expect(renderToString(<TiltLight>Card</TiltLight>)).not.toContain("style=");
  });
});
