import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BudgetNav } from "./BudgetNav";

const setup = (activeTab = "dashboard") => {
  const handlers = {
    onSelectTab: vi.fn(),
    onOpenRunway: vi.fn(),
    onAddCategory: vi.fn(),
  };
  render(
    <BudgetNav activeTab={activeTab} categoryTabs={["housing", "bills", "pets"]} {...handlers} />,
  );
  return handlers;
};

describe("<BudgetNav />", () => {
  it("marks the active view and keeps the stable test ids", () => {
    setup("housing");
    expect(screen.getByTestId("budget-tab-housing").getAttribute("aria-current")).toBe("page");
    expect(screen.getByTestId("budget-tab-overview").getAttribute("aria-current")).toBeNull();
    expect(screen.getByTestId("budget-tab-pets").textContent).toBe("Pets");
  });

  it("reports selections", () => {
    const { onSelectTab, onOpenRunway, onAddCategory } = setup();
    fireEvent.click(screen.getByTestId("budget-tab-bills"));
    expect(onSelectTab).toHaveBeenCalledWith("bills");
    fireEvent.click(screen.getByTestId("budget-tab-runway"));
    expect(onOpenRunway).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("add-category-btn"));
    expect(onAddCategory).toHaveBeenCalled();
  });
});
