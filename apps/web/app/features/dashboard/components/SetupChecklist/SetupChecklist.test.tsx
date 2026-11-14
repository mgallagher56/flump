import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSteps,
  SETUP_CHECKLIST_DISMISSED_KEY,
  SetupChecklist,
  type SetupChecklistProps,
} from "./SetupChecklist";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const base: SetupChecklistProps = {
  completedSteps: ["budget"],
  hasAccounts: true,
  hasBudget: true,
  hasMortgageAccount: false,
  hasProfile: true,
  hasRunForecast: false,
  enabledPages: ["accounts", "budget", "savings", "pension", "mortgage"],
};

const renderChecklist = (props: Partial<SetupChecklistProps> = {}) =>
  render(
    <MemoryRouter>
      <SetupChecklist {...base} {...props} />
    </MemoryRouter>,
  );

describe("SetupChecklist", () => {
  beforeEach(() => window.localStorage.clear());

  it("is one collapsed row that says how far setup has got", () => {
    renderChecklist();
    const toggle = screen.getByRole("button", { name: "Finish setting up: 2 of 5 done" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("expands on click to list the steps left, each with one link", () => {
    renderChecklist();
    fireEvent.click(screen.getByRole("button", { name: /Finish setting up/ }));
    expect(screen.getByRole("link", { name: "Add savings rates" }).getAttribute("href")).toBe(
      "/app/savings",
    );
    expect(screen.getByRole("link", { name: "Add pension details" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Add mortgage details" })).toBeTruthy();
    // Done steps have no link.
    expect(screen.queryByRole("link", { name: "Add account" })).toBeNull();
    expect(screen.getAllByLabelText("Done")).toHaveLength(2);
  });

  it("only lists app housekeeping: no forecasts or scenarios", () => {
    const text = buildSteps(base)
      .map((s) => `${s.label} ${s.description} ${s.actionLabel}`)
      .join(" ");
    expect(text).not.toMatch(/scenario|forecast|refine|drill|baseline|widget|module/i);
  });

  it("expands and collapses with the keyboard", async () => {
    const user = userEvent.setup();
    renderChecklist();
    const toggle = screen.getByRole("button", { name: /Finish setting up/ });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await user.keyboard(" ");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("disappears when every step is done", () => {
    const { container } = renderChecklist({
      completedSteps: ["budget", "accounts", "savings", "pension", "mortgage"],
    });
    expect(container.innerHTML).toBe("");
  });

  it("hides on request and remembers it", () => {
    renderChecklist();
    fireEvent.click(screen.getByRole("button", { name: "Hide setup checklist" }));
    expect(window.localStorage.getItem(SETUP_CHECKLIST_DISMISSED_KEY)).toBe("true");
    expect(screen.queryByTestId("setup-checklist")).toBeNull();
  });
});
