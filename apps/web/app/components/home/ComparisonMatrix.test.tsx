import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComparisonMatrix } from "./ComparisonMatrix";

describe("ComparisonMatrix", () => {
  it("lists only Flump features with no competitor columns", () => {
    render(<ComparisonMatrix />);

    expect(screen.getByRole("heading", { level: 2, name: /built for uk rules/i })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Feature" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Flump" })).toBeDefined();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getByText(/section 24 buy-to-let finance cost disallowance/i)).toBeDefined();
    expect(screen.getAllByText(/modelled/i)).toHaveLength(5);
    expect(screen.queryByText(/spreadsheets/i)).toBeNull();
    expect(screen.queryByText(/generic budget apps/i)).toBeNull();
  });
});
