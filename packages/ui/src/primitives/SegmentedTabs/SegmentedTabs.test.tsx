import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedTabs } from "./SegmentedTabs";

describe("SegmentedTabs Primitive", () => {
  const items = [
    { value: "avalanche", label: "Avalanche (Highest APR)" },
    { value: "snowball", label: "Snowball (Lowest Balance)" },
    { value: "minimum", label: "Minimum Only" },
  ];

  it("renders tab triggers and handles selection", () => {
    const handleSelect = vi.fn();
    render(<SegmentedTabs items={items} value="avalanche" onValueChange={handleSelect} />);

    const snowballBtn = screen.getByRole("tab", { name: "Snowball (Lowest Balance)" });
    expect(snowballBtn).toBeDefined();
    fireEvent.keyDown(snowballBtn, { key: "Enter", code: "Enter" });
    expect(handleSelect).toHaveBeenCalledWith("snowball");
  });

  it("keeps every panel mounted and hides the inactive ones", () => {
    render(
      <SegmentedTabs
        items={items}
        panels={{ avalanche: <p>First panel</p>, snowball: <p>Second panel</p> }}
        value="snowball"
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Second panel")).toBeDefined();
    expect(screen.queryByRole("tabpanel", { hidden: false })?.textContent).toBe("Second panel");
    expect(screen.getByText("First panel", { ignore: "" }).closest("[hidden]")).not.toBeNull();
    const tab = screen.getByRole("tab", { name: "Snowball (Lowest Balance)" });
    expect(document.getElementById(tab.getAttribute("aria-controls") ?? "")).not.toBeNull();
  });
});
