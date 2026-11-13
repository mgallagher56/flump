import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SampleModeProvider } from "~/context/SampleModeContext";
import { SampleAwareLink } from "./SampleAwareLink";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

describe("<SampleAwareLink />", () => {
  it("renders a normal link outside the sandbox", () => {
    render(
      <MemoryRouter>
        <SampleAwareLink to="/app/debt">Open</SampleAwareLink>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Open" }).getAttribute("href")).toBe("/app/debt");
  });

  it("renders a disabled, non-navigating item inside the sandbox", () => {
    render(
      <MemoryRouter>
        <SampleModeProvider value>
          <SampleAwareLink sampleLabel="Sign up to open" to="/app/debt">
            Open
          </SampleAwareLink>
        </SampleModeProvider>
      </MemoryRouter>,
    );
    const item = screen.getByRole("button", { name: "Sign up to open" });
    expect((item as HTMLButtonElement).disabled).toBe(true);
    expect(item.getAttribute("href")).toBeNull();
    expect(item.textContent).toBe("Sign up to open");
  });
});
