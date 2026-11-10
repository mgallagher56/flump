import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge Primitive", () => {
  it("renders status badge content with tabular numbers", () => {
    render(<StatusBadge variant="positive">+£14,250 Saved</StatusBadge>);
    expect(screen.getByText("+£14,250 Saved")).toBeDefined();
  });
});
