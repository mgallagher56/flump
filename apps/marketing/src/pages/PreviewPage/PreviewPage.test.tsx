import { render, screen, within } from "@testing-library/react";
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

  it("puts the hero, the three moments and the close in that order, each a band of its own (the approved prototype)", () => {
    renderPage();
    const bands = Array.from(screen.getByRole("main").children);
    expect(bands.map((band) => band.getAttribute("data-testid") ?? band.id)).toEqual([
      "preview-hero",
      "preview-moment-dashboard",
      "preview-moment-checkin",
      "preview-moment-breathing-room",
      "get-started",
    ]);
    expect(
      within(bands[0] as HTMLElement).getByRole("heading", { level: 1, name: PREVIEW_PAGE_TITLE }),
    ).toBeDefined();
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

  it("shows two document pictures, with only the close's ticket visible on a phone", () => {
    renderPage();
    const checkIn = screen.getByTestId("preview-illustration-checkin");
    expect(checkIn.querySelector('svg[data-scene="check-in"]')).not.toBeNull();
    // Wide screens only: on a phone the picture would push the figures below it down (B10).
    expect(checkIn.className).toMatch(/d_none/);
    const close = screen.getByTestId("feature-final-cta");
    expect(close.querySelector("[data-close-picture] svg")).not.toBeNull();
    expect(close.querySelector("[data-close-picture]")?.className).not.toMatch(/d_none/);
    expect(
      within(close).getByText(
        "Flump is free during the beta. Enter a few rough numbers to see where you stand.",
      ),
    ).toBeDefined();
  });

  it("links each sample to the feature page that explains it, named for where it goes (E42 S6)", () => {
    renderPage();
    for (const [testId, name, href] of [
      ["preview-moment-dashboard", "About accounts and net worth", "/features/accounts"],
      ["preview-moment-checkin", "About accounts and the monthly check-in", "/features/accounts"],
      ["preview-moment-breathing-room", "About budget and breathing room", "/features/budget"],
    ]) {
      const link = within(screen.getByTestId(testId)).getByRole("link", { name });
      expect(link.getAttribute("href")).toBe(href);
    }
    expect(screen.queryByRole("link", { name: /read more/i })).toBeNull();
  });
});
