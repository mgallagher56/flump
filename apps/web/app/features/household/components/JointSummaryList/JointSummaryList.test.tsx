import type { HouseholdJointSummaryItem } from "@flump/api-contract";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DUPLICATE_NOTE, JointSummaryList } from "./JointSummaryList";

const ITEMS: HouseholdJointSummaryItem[] = [
  { name: "Bills account", type: "Current", wholeBalance: 1234.5, addedBy: "you" },
  { name: "Bills account", type: "Current", wholeBalance: 1234.5, addedBy: "other" },
  { name: "Joint card", type: "Credit Card", wholeBalance: -310.25, addedBy: "other" },
];

const rows = () =>
  within(screen.getByRole("list", { name: "Shared joint accounts" })).getAllByRole("listitem");

describe("<JointSummaryList />", () => {
  it("lists each item in the backend's order with its type, who added it and its whole balance in en-GB", () => {
    render(<JointSummaryList items={ITEMS} otherName="Sam" />);
    const texts = rows().map((row) => row.textContent);
    expect(texts).toHaveLength(3);
    expect(texts[0]).toContain("Bills account");
    expect(texts[0]).toContain("Current account · Added by you");
    expect(texts[0]).toContain("£1,234.50");
    expect(texts[1]).toContain("Added by Sam");
    expect(texts[2]).toContain("Joint card");
    expect(texts[2]).toContain("Credit card · Added by Sam");
    expect(texts[2]).toContain("-£310.25");
  });

  it("names the other person neutrally when there is no name", () => {
    render(<JointSummaryList items={ITEMS} otherName={null} />);
    expect(rows()[1]?.textContent).toContain("Added by the other person");
  });

  it("shows no total and carries the duplicate note under the list", () => {
    const { container } = render(<JointSummaryList items={ITEMS} otherName="Sam" />);
    expect(screen.getByText(DUPLICATE_NOTE)).toBeDefined();
    expect(container.textContent).not.toMatch(/total/i);
    // Three balances on screen, one per row: nothing summed (1234.5 + 1234.5 - 310.25 = 2158.75).
    expect(container.textContent).not.toContain("2,158.75");
    expect(container.textContent).not.toContain("2,469");
  });

  it("with nothing shown, says so the same way whoever shares, with no duplicate note", () => {
    const { container } = render(<JointSummaryList items={[]} otherName="Sam" />);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByText(DUPLICATE_NOTE)).toBeNull();
    expect(container.textContent).toContain("No accounts are shown here yet.");
    expect(container.textContent).not.toContain("Sam");
  });

  it("when the summary could not be read, says so rather than showing it empty", () => {
    render(<JointSummaryList items={null} otherName="Sam" />);
    expect(screen.getByRole("status").textContent).toBe(
      "We could not load the household summary. Reload the page to try again.",
    );
    expect(screen.queryByText(/No accounts are shown/)).toBeNull();
  });
});
