import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("announces a default Loading label as a status", () => {
    render(<Spinner />);
    expect(screen.getByRole("status").textContent).toBe("Loading");
  });

  it("accepts a custom label", () => {
    render(<Spinner label="Calculating your payoff date" size="lg" />);
    expect(screen.getByRole("status").textContent).toBe("Calculating your payoff date");
  });

  it("hides the ring from assistive tech", () => {
    const { container } = render(<Spinner size="sm" tone="inherit" />);
    expect(container.querySelector("[aria-hidden='true']")).toBeTruthy();
  });

  it("announce=false hides the spinner entirely with no role or label", () => {
    const { container } = render(<Spinner announce={false} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(container.textContent).toBe("");
  });
});
