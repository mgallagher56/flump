import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SecurityPage } from "./SecurityPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("SecurityPage", () => {
  it("renders the page heading", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Security built into the architecture" }),
    ).toBeDefined();
  });

  it("does not offer an enquiry form that cannot send", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: /Contact security and support/i })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText(/Enquiry sent/i)).toBeNull();
  });

  it("makes no response-time promise", () => {
    renderPage();
    expect(screen.queryByText(/1 business day/i)).toBeNull();
  });
});
