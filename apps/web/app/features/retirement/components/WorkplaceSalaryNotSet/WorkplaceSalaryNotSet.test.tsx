import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WORKPLACE_SALARY_NOT_SET_TEXT, WorkplaceSalaryNotSet } from "./WorkplaceSalaryNotSet";

// Router links as plain anchors, so their targets can be checked.
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

describe("WorkplaceSalaryNotSet", () => {
  it("says the contributions are left out and links to the Pension page", () => {
    render(<WorkplaceSalaryNotSet />);
    // The wording the coordinator approved, 19 November 2026.
    expect(WORKPLACE_SALARY_NOT_SET_TEXT).toBe(
      "Workplace pension: your salary is not set, so your contributions are not included.",
    );
    expect(screen.getByText(WORKPLACE_SALARY_NOT_SET_TEXT, { exact: false })).toBeDefined();
    const link = screen.getByRole("link", { name: "Add your salary on the Pension page" });
    expect(link.getAttribute("href")).toBe("/app/pension#pension-details");
  });
});
