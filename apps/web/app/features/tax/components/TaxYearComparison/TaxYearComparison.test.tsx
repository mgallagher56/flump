import { calculateUKTax } from "@flump/finance-engine";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { taxRecordsFixture, taxResultFixture } from "../../__fixtures__/taxRecords";
import { TaxYearComparison } from "./TaxYearComparison";

describe("TaxYearComparison", () => {
  it("shows one column per year with row headers", () => {
    render(
      <MemoryRouter>
        <TaxYearComparison
          years={["2025/26", "2026/27"]}
          selectedYear="2026/27"
          results={{
            "2025/26": calculateUKTax("2025/26", taxRecordsFixture, 52000, 50),
            "2026/27": taxResultFixture,
          }}
        />
      </MemoryRouter>,
    );
    const table = screen.getByRole("table", { name: "Income and tax by tax year" });
    expect(Array.from(table.querySelectorAll("thead th")).map((c) => c.textContent)).toEqual([
      "Line",
      "2025/26",
      "2026/27",
    ]);
    expect(within(table).getByRole("rowheader", { name: "Rental income" })).toBeDefined();
    expect(within(table).getByText("Self-employed")).toBeDefined();
  });
});
