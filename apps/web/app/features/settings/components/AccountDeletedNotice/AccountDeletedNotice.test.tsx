import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { FINANCIAL_BASELINE_STORAGE_KEY } from "~/state/baseline.store";
import { AccountDeletedNotice } from "./AccountDeletedNotice";

describe("<AccountDeletedNotice />", () => {
  beforeEach(() => window.localStorage.clear());

  it("confirms the deletion and links home", () => {
    render(<AccountDeletedNotice homeUrl="https://flump.example" />);
    expect(screen.getByRole("heading", { name: "Your account has been deleted" })).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Go to the Flump homepage" }).getAttribute("href"),
    ).toBe("https://flump.example");
  });

  it("clears this browser's per-user storage but keeps device preferences", () => {
    window.localStorage.setItem(FINANCIAL_BASELINE_STORAGE_KEY, "{}");
    window.localStorage.setItem("flump_setup_checklist_dismissed", "1");
    window.localStorage.setItem("unrelated", "kept");
    render(<AccountDeletedNotice homeUrl="/" />);
    expect(window.localStorage.getItem(FINANCIAL_BASELINE_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("flump_setup_checklist_dismissed")).toBeNull();
    expect(window.localStorage.getItem("unrelated")).toBe("kept");
  });

  it("shows the last step instead of the confirmation when the deletion is pending", () => {
    render(<AccountDeletedNotice homeUrl="/" pending />);
    expect(screen.getByRole("heading", { name: "Finish deleting your account" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Your account has been deleted" })).toBeNull();
  });
});
