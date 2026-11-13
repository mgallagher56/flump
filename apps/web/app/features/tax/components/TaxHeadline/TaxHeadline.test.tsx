import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { taxResultFixture } from "../../__fixtures__/taxRecords";
import { TaxHeadline } from "./TaxHeadline";

describe("TaxHeadline", () => {
  it("puts the Self Assessment estimate in the single hero", () => {
    const { container } = render(
      <MemoryRouter>
        <TaxHeadline taxYear="2026/27" result={taxResultFixture} ownershipSharePct={50} />
      </MemoryRouter>,
    );
    const heroes = container.querySelectorAll('[data-tone="hero"]');
    expect(heroes).toHaveLength(1);
    expect(heroes[0].textContent).toContain("Estimated Self Assessment due for 2026/27");
    expect(heroes[0].textContent).toContain(
      "Estimate for 2026/27, based on the figures you entered",
    );
    expect(screen.getByRole("heading", { name: "Where you stand" })).toBeDefined();
    expect(screen.getByText("Your share of rental profit")).toBeDefined();
    expect(container.textContent).toContain("50% of");
  });

  it("shows Not set rather than £0 when there is no salary", () => {
    const { container } = render(
      <MemoryRouter>
        <TaxHeadline
          taxYear="2026/27"
          result={{ ...taxResultFixture, effectivePayeSalary: 0 }}
          ownershipSharePct={100}
        />
      </MemoryRouter>,
    );
    expect(container.textContent).toMatch(/Salary Not set\s*Add salary/);
    expect(container.textContent).not.toContain("Salary £0");
  });
});
