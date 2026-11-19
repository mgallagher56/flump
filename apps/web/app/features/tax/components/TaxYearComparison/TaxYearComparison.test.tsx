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

  it("shows the add salary prompt only when the salary is not known", () => {
    const results = { "2026/27": calculateUKTax("2026/27", [], 0, 100) };
    const { unmount } = render(
      <MemoryRouter>
        <TaxYearComparison
          years={["2026/27"]}
          selectedYear="2026/27"
          results={results}
          salaryKnown={false}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Add salary")).toBeDefined();
    unmount();
    // A saved salary of 0 is a real figure: £0, no prompt.
    render(
      <MemoryRouter>
        <TaxYearComparison years={["2026/27"]} selectedYear="2026/27" results={results} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Add salary")).toBeNull();
  });

  it("shows Not set, never £0, for a year whose estimate cannot be worked out", () => {
    // 2025/26 has no result (a fact the estimate depends on is not set); 2026/27 has one.
    render(
      <MemoryRouter>
        <TaxYearComparison
          years={["2025/26", "2026/27"]}
          selectedYear="2026/27"
          results={{ "2026/27": taxResultFixture }}
        />
      </MemoryRouter>,
    );
    const bill = screen.getByRole("rowheader", { name: "Estimated tax bill" }).closest("tr");
    const cells = Array.from(bill?.querySelectorAll("td") ?? []).map((c) => c.textContent);
    expect(cells[0]).toBe("Not set");
    expect(cells[1]).not.toBe("Not set");
  });
});
