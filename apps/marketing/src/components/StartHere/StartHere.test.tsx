import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("reopens a line its link names even when the hash already points there", () => {
    window.history.replaceState(null, "", "/features#net-worth");
    render(
      <>
        <StartHere />
        <details id="net-worth">
          <summary>Net worth</summary>
        </details>
      </>,
    );
    const details = document.getElementById("net-worth") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    fireEvent.click(screen.getByRole("link", { name: "Net worth" }));
    expect(details.open).toBe(true);
    window.history.replaceState(null, "", "/");
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
