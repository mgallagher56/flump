import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MONTHLY_PICTURE_ITEMS, MonthlyPictureSection } from "./MonthlyPictureSection";

describe("MonthlyPictureSection", () => {
  it("shows months of cover, safe to spend and the monthly check-in in that order", () => {
    render(<MonthlyPictureSection />);
    expect(screen.getByRole("heading", { level: 2, name: "Your monthly picture" })).toBeDefined();
    const items = within(screen.getByRole("list", { name: "Your monthly picture" })).getAllByRole(
      "listitem",
    );
    expect(items.map((li) => li.querySelector("span")?.textContent)).toEqual([
      "Months of cover",
      "Safe to spend",
      "Monthly check-in",
    ]);
  });

  it("labels every figure as an example", () => {
    render(<MonthlyPictureSection />);
    expect(screen.getAllByText("Example")).toHaveLength(MONTHLY_PICTURE_ITEMS.length);
    expect(screen.getByText("6.4 months")).toBeDefined();
  });

  it("does not set a cover target for the reader", () => {
    render(<MonthlyPictureSection />);
    expect(screen.getByText(/does not set a target for you/)).toBeDefined();
  });
});
