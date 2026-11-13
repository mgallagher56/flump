import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ErrorShell } from "./ErrorShell";

// The shared setup stubs Link to render only its children; the logo link needs the real anchor.
vi.mock("react-router", async () => await vi.importActual("react-router"));

describe("ErrorShell", () => {
  it("renders a skip link, the logo link and the content inside main", () => {
    render(
      <MemoryRouter>
        <ErrorShell>
          <p>Child</p>
        </ErrorShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Skip to content" }).getAttribute("href")).toBe(
      "#main-content",
    );
    expect(screen.getByRole("link", { name: "Flump home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("main").textContent).toBe("Child");
  });
});
