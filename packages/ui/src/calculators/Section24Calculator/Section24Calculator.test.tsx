import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Section24Calculator } from "./Section24Calculator";

describe("Section24Calculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<Section24Calculator />);
    expect(container).toBeDefined();
  });
});
