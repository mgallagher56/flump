import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { __Name__ } from "./__Name__";

describe("__Name__", () => {
  it("renders its children", () => {
    render(<__Name__>Example content</__Name__>);
    expect(screen.getByText("Example content")).toBeDefined();
  });
});
