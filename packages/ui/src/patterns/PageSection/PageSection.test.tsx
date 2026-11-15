import { render, screen } from "@testing-library/react";
import { LifeBuoy } from "lucide-react";
import { describe, expect, it } from "vitest";
import { PageSection } from "./PageSection";

describe("PageSection", () => {
  it("is a region named by its section header", () => {
    render(
      <PageSection
        description="How long your savings would cover the essentials."
        icon={LifeBuoy}
        title="Breathing room"
        tone="accent"
      >
        <p>Content</p>
      </PageSection>,
    );
    const region = screen.getByRole("region", { name: "Breathing room" });
    expect(region.textContent).toContain("Content");
    expect(screen.getByRole("heading", { level: 2, name: "Breathing room" })).toBeDefined();
  });

  it("pairs id and data-testid, and derives the header id", () => {
    render(
      <PageSection icon={LifeBuoy} id="breathing-room" title="Breathing room">
        x
      </PageSection>,
    );
    expect(screen.getByTestId("breathing-room").id).toBe("breathing-room");
    expect(screen.getByTestId("breathing-room-header").id).toBe("breathing-room-header");
  });

  it("passes the heading level and the action through to the header", () => {
    render(
      <PageSection
        action={<button type="button">Edit</button>}
        as="h3"
        icon={LifeBuoy}
        title="Your details"
      />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Your details" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Edit" })).toBeDefined();
  });

  it("takes a heading id, and the heading can take focus from script", () => {
    render(<PageSection headingId="debts-heading" icon={LifeBuoy} title="Your debts" />);
    const heading = screen.getByRole("heading", { name: "Your debts" });
    expect(heading.id).toBe("debts-heading");
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByRole("region", { name: "Your debts" })).toBeDefined();
  });
});
