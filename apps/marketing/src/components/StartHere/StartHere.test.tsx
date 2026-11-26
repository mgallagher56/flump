import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { START_HERE } from "../../utils/featureIndex";
import { StartHere } from "./StartHere";

describe("StartHere", () => {
  it("is a labelled navigation landmark with one list of links per goal", () => {
    render(<StartHere />);
    const nav = screen.getByRole("navigation", { name: "Start here" });
    for (const entry of START_HERE) {
      expect(within(nav).getByText(entry.goal).tagName).toBe("P");
      const links = within(within(nav).getByRole("list", { name: entry.goal })).getAllByRole(
        "link",
      );
      expect(links.map((link) => link.getAttribute("href"))).toEqual(
        entry.lines.map((id) => `#${id}`),
      );
    }
  });

  it("names each link after the line it opens", () => {
    render(<StartHere />);
    const list = screen.getByRole("list", { name: "See your net worth" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Accounts list", "Net worth", "Monthly check-in", "Net worth history"]);
  });
});
