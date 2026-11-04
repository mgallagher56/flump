import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ScenarioLayersWidget from "./ScenarioLayersWidget";

describe("ScenarioLayersWidget", () => {
  it("renders scenario event chips and toggles life events", () => {
    const mockToggle = vi.fn();
    render(<ScenarioLayersWidget onScenarioToggle={mockToggle} />);

    expect(screen.getByText("Life Event Scenario Layers")).toBeDefined();
    expect(screen.getByText("Buy £450k Home in 2028")).toBeDefined();
    expect(screen.getByText("Have a Child in 2027")).toBeDefined();
    expect(screen.getByText("Remortgage at 5.2% (2027)")).toBeDefined();
    expect(screen.getByText("Retire Early at 57 (ISA Bridge)")).toBeDefined();

    const homeChip = screen.getByText("Buy £450k Home in 2028");
    fireEvent.click(homeChip);

    expect(mockToggle).toHaveBeenCalledWith(["buy_home_2028"]);
    expect(screen.getByText(/30-yr trajectory impact/i)).toBeDefined();

    // Toggle off to cover line 81
    fireEvent.click(homeChip);
    expect(mockToggle).toHaveBeenCalledWith([]);
  });

  it("renders and toggles without crashing when onScenarioToggle is omitted", () => {
    render(<ScenarioLayersWidget />);
    const childChip = screen.getByText("Have a Child in 2027");
    fireEvent.click(childChip);
    expect(screen.getByText(/30-yr trajectory impact/i)).toBeDefined();
  });
});
