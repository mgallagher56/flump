import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HELP_LINE_URL, HELP_LINE_WORDING_APPROVED, SharingHelpLine } from "./SharingHelpLine";

describe("<SharingHelpLine />", () => {
  it("is not marked as approved by the owner", () => {
    expect(HELP_LINE_WORDING_APPROVED).toBe(false);
  });

  it("shows option A as one link out in a new tab, with no referrer", () => {
    const { container } = render(<SharingHelpLine />);
    const link = screen.getByRole("link", {
      name: "Surviving Economic Abuse has information about economic abuse and where to find support. (opens in a new tab)",
    });
    expect(link.getAttribute("href")).toBe(HELP_LINE_URL);
    expect(HELP_LINE_URL).toBe("https://survivingeconomicabuse.org/i-need-help/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    // The external-link cue: an icon inside the link.
    expect(link.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("p")?.textContent).toBe(
      "Surviving Economic Abuse has information about economic abuse and where to find support. (opens in a new tab)",
    );
  });

  it("carries a visible marker that the wording is not yet approved", () => {
    render(<SharingHelpLine />);
    expect(screen.getByText("Wording not yet approved by the owner")).toBeDefined();
  });

  it("renders the same output every time, with no click handler to track anything", () => {
    const first = render(<SharingHelpLine />).container.innerHTML;
    const second = render(<SharingHelpLine />).container.innerHTML;
    expect(second).toBe(first);
    expect(first).not.toContain("onclick");
    expect(first).not.toContain("data-track");
  });
});
