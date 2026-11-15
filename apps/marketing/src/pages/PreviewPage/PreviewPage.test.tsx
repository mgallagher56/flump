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
});
