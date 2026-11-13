import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { taxResultFixture } from "../../__fixtures__/taxRecords";
import { TaxReservePanel } from "./TaxReservePanel";

const setup = () => {
  const props = {
    onPayeSalaryChange: vi.fn(),
    onOwnershipShareChange: vi.fn(),
    onSave: vi.fn(),
  };
  render(
    <MemoryRouter>
      <TaxReservePanel
        taxYear="2026/27"
        result={taxResultFixture}
        trapGrossIncome={taxResultFixture.totalGrossIncome}
        trapRegion={null}
        payeSalary={52000}
        ownershipSharePct={50}
        saving={false}
        {...props}
      />
    </MemoryRouter>,
  );
  return props;
};

describe("TaxReservePanel", () => {
  it("lists the workings ending in the estimated bill", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: /How the estimate is worked out for 2026\/27/ }),
    ).toBeDefined();
    const terms = Array.from(document.querySelectorAll("dt")).map((d) => d.textContent);
    expect(terms.at(-1)).toBe("Estimated Self Assessment due");
    expect(terms).toContain("Personal Allowance");
  });

  it("reports input changes and saves", () => {
    const { onOwnershipShareChange, onSave } = setup();
    fireEvent.change(screen.getByLabelText("Property ownership share"), {
      target: { value: "75" },
    });
    expect(onOwnershipShareChange).toHaveBeenCalledWith(75);
    fireEvent.click(screen.getByRole("button", { name: "Save to profile" }));
    expect(onSave).toHaveBeenCalled();
  });
});
