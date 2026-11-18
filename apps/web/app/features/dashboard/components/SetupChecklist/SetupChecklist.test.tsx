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

  it("renders the compact 2A row with ProgressRing, next step and single collapsed action", () => {
    renderChecklist();
    const ring = screen.getByRole("progressbar", { name: "Setup progress" });
    expect(ring.getAttribute("aria-valuetext")).toBe("2 of 5");
    expect(ring.textContent).toBe("2/5");

    const toggle = screen.getByRole("button", { name: /Finish setting up/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toContain("Next: Add your savings rates");

    const collapsedLinks = screen.getAllByRole("link");
    expect(collapsedLinks).toHaveLength(1);
    expect(collapsedLinks[0]?.textContent).toBe("Add savings rates");
    expect(collapsedLinks[0]?.getAttribute("href")).toBe("/app/savings");
  });

  it("expands on click to highlight the next step and offer Not for me on unfinished steps", () => {
    renderChecklist();
    fireEvent.click(screen.getByRole("button", { name: /Finish setting up/ }));
    expect(screen.getByRole("link", { name: "Add savings rates" }).getAttribute("href")).toBe(
      "/app/savings",
    );
    expect(screen.getByRole("link", { name: "Add pension details" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Add mortgage details" })).toBeTruthy();
    // Done steps have no link or Not for me button.
    expect(screen.queryByRole("link", { name: "Add account" })).toBeNull();
    expect(screen.getAllByLabelText("Done")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Not for me/ })).toHaveLength(3);
    expect(document.querySelector('[data-setup-next="true"]')?.textContent).toContain(
      "Add your savings rates",
    );
  });

  it("marks skipped steps via onSkipStep", () => {
    const onSkipStep = vi.fn();
    renderChecklist({ onSkipStep });
    fireEvent.click(screen.getByRole("button", { name: /Finish setting up/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Not for me, skip Add your savings rates" }),
    );
    expect(onSkipStep).toHaveBeenCalledWith("savings");
  });

  it("shows the 2C Setup finished card with sprout when the last step completes during the visit", () => {
    renderChecklist({
      completedSteps: ["budget", "accounts", "savings", "pension"],
    });
    fireEvent.click(screen.getByRole("button", { name: /Finish setting up/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Not for me, skip Add your mortgage details" }),
    );
    expect(screen.getByTestId("setup-checklist-finished")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Setup finished" })).toBeTruthy();
    expect(
      screen.getByText(
        "Setup is finished. Everything on your dashboard now uses your own figures.",
      ),
    ).toBeTruthy();
    expect(document.querySelector("[data-setup-finished]")).not.toBeNull();
    expect(document.querySelector('[data-scene-part="sprout"]')).not.toBeNull();
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

  it("disappears when every step is already done on mount", () => {
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
