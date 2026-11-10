import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppSectionDivider } from "./AppSectionDivider";

describe("AppSectionDivider Pattern", () => {
  it("renders label, badge, and action slot", () => {
    render(
      <AppSectionDivider
        action={<button type="button">Action</button>}
        badge="4 Active"
        label="Debts & Liabilities"
      />,
    );
    expect(screen.getByText("Debts & Liabilities")).toBeDefined();
    expect(screen.getByText("4 Active")).toBeDefined();
  });
});
