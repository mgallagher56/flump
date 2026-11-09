import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CollapsibleSection from "./CollapsibleSection";

describe("<CollapsibleSection />", () => {
  it("toggles content visibility when clicking header", () => {
    render(
      <CollapsibleSection subtitle="View full breakdown" title="Historical Ledger">
        <div>Ledger details content</div>
      </CollapsibleSection>,
    );

    expect(screen.getByText("Historical Ledger")).toBeDefined();
    expect(screen.queryByText("Ledger details content")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Historical Ledger/i }));
    expect(screen.getByText("Ledger details content")).toBeDefined();
  });
});
