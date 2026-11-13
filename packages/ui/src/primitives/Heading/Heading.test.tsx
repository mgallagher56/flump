import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heading } from "./Heading";

describe("Heading", () => {
  it("renders an h2 by default", () => {
    render(<Heading>Where you stand</Heading>);
    expect(screen.getByRole("heading", { level: 2, name: "Where you stand" })).toBeDefined();
  });

  it.each(["h1", "h2", "h3", "h4"] as const)("renders %s semantics", (as) => {
    render(<Heading as={as}>Over time</Heading>);
    expect(screen.getByRole("heading", { level: Number(as[1]) })).toBeDefined();
  });

  it("keeps semantics independent of visual size", () => {
    render(
      <>
        <Heading as="h2" size="sm">
          Small h2
        </Heading>
        <Heading as="h2">Default h2</Heading>
      </>,
    );
    expect(screen.getByText("Small h2").tagName).toBe("H2");
    expect(screen.getByText("Small h2").className).not.toBe(
      screen.getByText("Default h2").className,
    );
  });

  it("uses a different default size per level", () => {
    render(
      <>
        <Heading as="h1">One</Heading>
        <Heading as="h4">Four</Heading>
      </>,
    );
    expect(screen.getByText("One").className).not.toBe(screen.getByText("Four").className);
  });
});
