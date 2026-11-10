import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card Primitive", () => {
  it("renders children with surface styling", () => {
    render(<Card>Portfolio Summary Content</Card>);
    expect(screen.getByText("Portfolio Summary Content")).toBeDefined();
  });
});
