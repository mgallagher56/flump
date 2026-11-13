import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SampleModeProvider } from "~/context/SampleModeContext";
import { SampleAwareLink } from "./SampleAwareLink";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderSandbox = (ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <SampleModeProvider value>{ui}</SampleModeProvider>
    </MemoryRouter>,
  );

describe("<SampleAwareLink />", () => {
  it("renders a normal link outside the sandbox", () => {
    render(
      <MemoryRouter>
        <SampleAwareLink to="/app/debt">Open</SampleAwareLink>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Open" }).getAttribute("href")).toBe("/app/debt");
  });

  it("renders a focusable aria-disabled item with no href inside the sandbox", () => {
    renderSandbox(<SampleAwareLink to="/app/debt">Open</SampleAwareLink>);
    const item = screen.getByRole("button", { name: "signUpToOpen" });
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect((item as HTMLButtonElement).disabled).toBe(false);
    expect(item.getAttribute("href")).toBeNull();
    item.focus();
    expect(document.activeElement).toBe(item);
  });

  it("does not activate", () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <MemoryRouter>
        <SampleModeProvider value>
          <form onSubmit={onSubmit}>
            <SampleAwareLink to="/app/debt">Open</SampleAwareLink>
          </form>
        </SampleModeProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("forwards id, data and aria props and the ref to the disabled item", () => {
    const ref = createRef<HTMLElement>();
    renderSandbox(
      <SampleAwareLink
        ref={ref}
        data-testid="x"
        id="open-debt"
        aria-describedby="note"
        to="/app/debt"
      >
        Open
      </SampleAwareLink>,
    );
    const item = screen.getByRole("button");
    expect(item.id).toBe("open-debt");
    expect(item.getAttribute("aria-describedby")).toBe("note");
    expect(ref.current).toBe(item);
  });
});
