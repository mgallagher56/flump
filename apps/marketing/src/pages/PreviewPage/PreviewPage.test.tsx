import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PREVIEW_PAGE_DESCRIPTION, PREVIEW_PAGE_TITLE, PreviewPage } from "./PreviewPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <PreviewPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("PreviewPage", () => {
  it("renders page title and description", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: PREVIEW_PAGE_TITLE })).toBeDefined();
    expect(screen.getAllByText(PREVIEW_PAGE_DESCRIPTION).length).toBeGreaterThanOrEqual(1);
  });

  it("puts the section gap between the moments only, not under the page header (P73)", () => {
    renderPage();
    const dashboard = screen.getByTestId("preview-moment-dashboard");
    const header = screen.getByRole("heading", { level: 1, name: PREVIEW_PAGE_TITLE });
    // The header is not a sibling inside the gapped column, so no gap stacks on its own margin.
    expect(dashboard.parentElement?.contains(header)).toBe(false);
    expect(dashboard.parentElement?.className).toContain("gap_10");
  });

  it("renders all three preview moments", () => {
    renderPage();
    expect(screen.getByTestId("preview-moment-dashboard")).toBeDefined();
    expect(screen.getByTestId("preview-moment-checkin")).toBeDefined();
    expect(screen.getByTestId("preview-moment-breathing-room")).toBeDefined();
  });

  it("renders example household frames with sample figures caption", () => {
    renderPage();
    const captions = screen.getAllByText("Example household. These are sample figures.");
    expect(captions.length).toBe(3);
  });

  it("renders the invite call to action", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: "Ready to see your own figures?" }),
    ).toBeDefined();
    expect(
      screen.getAllByRole("link", { name: "Request an invite" }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("gives each section one visible h2, and the frames add no second heading", () => {
    renderPage();
    const sections = [
      ["preview-moment-dashboard", "Dashboard picture"],
      ["preview-moment-checkin", "Monthly check-in"],
      ["preview-moment-breathing-room", "What a change would do"],
    ] as const;
    for (const [testId, heading] of sections) {
      const section = screen.getByTestId(testId);
      const h2 = screen.getByRole("heading", { level: 2, name: heading });
      expect(section.contains(h2)).toBe(true);
      expect(h2.className).not.toMatch(/sr-only/);
      expect(h2.className).toMatch(/textStyle_heading\.md/);
      // Heading, then description, then the frame.
      const frame = section.querySelector("figure");
      expect(frame).not.toBeNull();
      expect(
        h2.compareDocumentPosition(frame as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(screen.queryByRole("heading", { name: "Dashboard" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Check-in" })).toBeNull();
  });

  it("shows illustrations, with only the call to action's visible on a phone", () => {
    const { container } = renderPage();
    const scenes = container.querySelectorAll("svg[data-scene]");
    expect(scenes).toHaveLength(2);
    expect(screen.getByTestId("preview-illustration-checkin").className).toMatch(/d_none/);
    expect(screen.getByTestId("preview-illustration-cta").className).not.toMatch(/d_none/);
  });
});
