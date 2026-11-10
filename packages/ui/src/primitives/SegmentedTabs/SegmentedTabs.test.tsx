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
});
