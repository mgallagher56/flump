import { render, screen } from "@testing-library/react";
import { PiggyBank } from "lucide-react";
import { describe, expect, it } from "vitest";
import { SectionHeader } from "./SectionHeader";

describe("SectionHeader", () => {
  it("shows a decorative tile, an h2 title and one line of description", () => {
    const { container } = render(
      <SectionHeader
        description="What you can draw on, and how long it would last."
        domain="savings"
        icon={PiggyBank}
        title="Breathing room"
      />,
    );
    const heading = screen.getByRole("heading", { level: 2, name: "Breathing room" });
    expect(heading).toBeDefined();
    expect(screen.getByText("What you can draw on, and how long it would last.")).toBeDefined();
    const tile = container.querySelector("[data-tile-tone]");
    expect(tile?.getAttribute("data-tile-tone")).toBe("sage");
    expect(tile?.getAttribute("aria-hidden")).toBe("true");
  });

  it("takes the accent tile, a heading level and a heading id", () => {
    const { container } = render(
      <SectionHeader
        as="h3"
        headingId="s-title"
        icon={PiggyBank}
        title="Your details"
        tone="accent"
      />,
    );
    expect(screen.getByRole("heading", { level: 3 }).id).toBe("s-title");
    const tile = container.querySelector("[data-tile-tone]") as HTMLElement;
    expect(tile.getAttribute("data-tile-tone")).toBe("accent");
    expect(tile.className).toContain("accent.subtle");
  });

  it("pairs id and data-testid, and renders the addon and one action", () => {
    render(
      <SectionHeader
        action={<button type="button">Edit</button>}
        icon={PiggyBank}
        id="details-header"
        title="Your details"
        titleAddon={<span>Estimate</span>}
      />,
    );
    const root = screen.getByTestId("details-header");
    expect(root.id).toBe("details-header");
    expect(screen.getByRole("button", { name: "Edit" })).toBeDefined();
    expect(screen.getByText("Estimate")).toBeDefined();
  });

  it("leaves the description out when none is given", () => {
    const { container } = render(<SectionHeader icon={PiggyBank} title="History" />);
    expect(container.querySelector("p")).toBeNull();
  });
});
