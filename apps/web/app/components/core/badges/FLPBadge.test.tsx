import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FLPBadge from "./FLPBadge";

describe("<FLPBadge />", () => {
  it("renders badge with text and semantic variant", () => {
    render(<FLPBadge variant="positive">+£420/mo</FLPBadge>);
    expect(screen.getByText("+£420/mo")).toBeDefined();
  });
});
