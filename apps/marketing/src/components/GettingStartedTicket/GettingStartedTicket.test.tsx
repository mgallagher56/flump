import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GettingStartedTicket, TICKET_STEPS } from "./GettingStartedTicket";

const texts = () =>
  Array.from(screen.getByTestId("getting-started-ticket").querySelectorAll("text")).map(
    (t) => t.textContent,
  );

describe("GettingStartedTicket", () => {
  it("is decoration, hidden from assistive technology (the close's words say the same)", () => {
    render(<GettingStartedTicket />);
    const svg = screen.getByTestId("getting-started-ticket");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
  });

  it("carries the prototype's words: the title, the Example tag and the three numbered steps", () => {
    render(<GettingStartedTicket />);
    expect(texts()).toEqual([
      "Getting started",
      "Example",
      "1",
      "Rough",
      "figures",
      "£3,249 in",
      "2",
      "Your",
      "picture",
      "£232,000",
      "net worth",
      "3",
      "Check in",
      "Once a",
      "month",
    ]);
    expect(TICKET_STEPS).toHaveLength(3);
  });

  it("centres each step's lines in its column, with a perforation between columns and no top band", () => {
    render(<GettingStartedTicket />);
    const svg = screen.getByTestId("getting-started-ticket");
    const steps = Array.from(svg.querySelectorAll("g[text-anchor='middle']"));
    expect(steps).toHaveLength(3);
    // Each column's lines share one x, and the columns run left to right.
    const xs = steps.map((step) => {
      const own = new Set(
        Array.from(step.querySelectorAll("text")).map((t) => t.getAttribute("x")),
      );
      expect(own.size).toBe(1);
      return Number([...own][0]);
    });
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    expect(svg.querySelectorAll("line")).toHaveLength(2);
    // The paper is a plain rounded rectangle: no path drawn across its top.
    expect(svg.querySelectorAll("path")).toHaveLength(0);
    // Turned two degrees back, as the prototype.
    expect(svg.querySelector("g")?.getAttribute("transform")).toMatch(/^rotate\(-2 /);
  });

  it("gives each drawing its own pattern and gradient ids, so two on a page never share one", () => {
    render(
      <>
        <GettingStartedTicket />
        <GettingStartedTicket />
      </>,
    );
    const ids = Array.from(document.querySelectorAll("pattern, linearGradient")).map((el) => el.id);
    expect(new Set(ids).size).toBe(4);
  });
});
