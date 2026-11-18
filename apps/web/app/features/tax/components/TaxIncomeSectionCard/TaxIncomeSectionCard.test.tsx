import type { TaxRecord } from "@flump/finance-engine";
import { render, screen } from "@testing-library/react";
import { Laptop } from "lucide-react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { TaxIncomeSectionCard } from "./TaxIncomeSectionCard";

// The global setup stubs Link; the row's link needs the real one.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const base: TaxRecord = {
  id: "rec-1",
  userId: "user-1",
  name: "Consulting client",
  source: "self-employed",
  type: "income",
  amount: 1000,
  frequency: "monthly",
  date: "2024-04-06",
  endDate: null,
  category: "self_employed_income",
  notes: null,
  receiptFilename: null,
  receiptMimeType: null,
  receiptData: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};
const cost: TaxRecord = { ...base, id: "rec-2", name: "Software", type: "expense", amount: 100 };

const renderRow = (records: TaxRecord[]) =>
  render(
    <MemoryRouter>
      <ul>
        <TaxIncomeSectionCard
          icon={Laptop}
          records={records}
          selectedTaxYear="2024/25"
          source="self-employed"
          title="Self-employed"
        />
      </ul>
    </MemoryRouter>,
  );

describe("<TaxIncomeSectionCard />", () => {
  it("shows the source, its record count and income less expenses in whole pounds", () => {
    renderRow([base, cost]);
    const row = screen.getByTestId("tax-source-self-employed");
    expect(row.hasAttribute("data-list-row")).toBe(true);
    expect(row.textContent).toContain("Self-employed");
    expect(row.textContent).toContain("2 records");
    // 12 x £1,000 less 12 x £100, with no pence.
    expect(row.textContent).toContain("£10,800");
    expect(row.textContent).not.toMatch(/\.\d{2}/);
  });

  it("renders nothing for a source with no records in the year", () => {
    const { container } = renderRow([]);
    expect(container.querySelector("li")).toBeNull();
    expect(container.textContent).not.toContain("£0");
  });

  it("uses no judgement colour on the total", () => {
    renderRow([base]);
    expect(screen.getByTestId("tax-source-self-employed").innerHTML).not.toMatch(/positive|danger/);
  });

  it("is one link to the source's page on the same tax year, inside its list item", () => {
    renderRow([base, cost]);
    const link = screen.getByRole("link", { name: /Self-employed/ });
    expect(link.getAttribute("href")).toBe("/app/self-assessment/self-employed?year=2024-25");
    expect(link.closest("li")).toBe(screen.getByTestId("tax-source-self-employed"));
    expect(screen.getByRole("listitem")).toBeDefined();
  });
});
