import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import customRender from "~/testUtils/customRender";
import { UkDebtInstrumentsCard } from "./UkDebtInstrumentsCard";

const panel = (name: RegExp) => within(screen.getByRole("tabpanel", { name }));

describe("UkDebtInstrumentsCard", () => {
  it("uses a level 2 heading with level 3 results beneath it", () => {
    customRender(<UkDebtInstrumentsCard />);
    expect(screen.getByRole("heading", { level: 2, name: "UK debt rules and help" })).toBeDefined();
    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
    expect(screen.getByText("Promotional expiry diagnosis").tagName).toBe("H3");
  });

  it("exposes four tabs and switches panels with click and arrow keys", () => {
    customRender(<UkDebtInstrumentsCard />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: /Arranged overdraft cost/ }));
    expect(screen.getByRole("tabpanel", { name: /Arranged overdraft cost/ })).toBeDefined();
    fireEvent.keyDown(screen.getByRole("tab", { name: /Arranged overdraft cost/ }), {
      key: "ArrowRight",
    });
    expect(
      screen.getByRole("tab", { name: /PCP or HP balloon/ }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("shows the 0% expiry alert when under 90 days remain", () => {
    customRender(<UkDebtInstrumentsCard />);
    const p = panel(/0% expiry tracker/);
    fireEvent.change(p.getByLabelText("Months left on the 0% window"), { target: { value: "1" } });
    expect(p.getByText(/Promotional window alert/)).toBeDefined();
    expect(p.getByText(/revert APR applies/)).toBeDefined();
  });

  it("clearing a figure shows no result instead of treating it as 0", () => {
    customRender(<UkDebtInstrumentsCard />);
    fireEvent.click(screen.getByRole("tab", { name: /Arranged overdraft cost/ }));
    const p = panel(/Arranged overdraft cost/);
    expect(p.getByText(/a year$/)).toBeDefined();
    fireEvent.change(p.getByLabelText("Average arranged overdraft balance"), {
      target: { value: "" },
    });
    expect(p.getByText("Enter all the figures to see the result.")).toBeDefined();
    expect(p.queryByText(/a year$/)).toBeNull();
    expect((p.getByLabelText("Average arranged overdraft balance") as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("calculates the overdraft cost from the balance and EAR", () => {
    customRender(<UkDebtInstrumentsCard />);
    fireEvent.click(screen.getByRole("tab", { name: /Arranged overdraft cost/ }));
    const p = panel(/Arranged overdraft cost/);
    fireEvent.change(p.getByLabelText("Average arranged overdraft balance"), {
      target: { value: "1500" },
    });
    fireEvent.change(p.getByLabelText("Bank EAR rate"), { target: { value: "40" } });
    expect(p.getByText("£600 a year")).toBeDefined();
  });

  it("states the balloon result as a fact", () => {
    customRender(<UkDebtInstrumentsCard />);
    fireEvent.click(screen.getByRole("tab", { name: /PCP or HP balloon/ }));
    const p = panel(/PCP or HP balloon/);
    fireEvent.change(p.getByLabelText("Months left in the agreement"), { target: { value: "18" } });
    expect(p.getByText(/Saving £\d+ a month for the remaining term would add up to/)).toBeDefined();
  });

  it("switches student loan plan and shows the statutory deduction", () => {
    customRender(<UkDebtInstrumentsCard />);
    fireEvent.click(screen.getByRole("tab", { name: /Student loan outlook/ }));
    const p = panel(/Student loan outlook/);
    fireEvent.change(p.getByLabelText("Student loan plan"), { target: { value: "plan1" } });
    fireEvent.change(p.getByLabelText("Gross annual salary"), { target: { value: "120000" } });
    expect(p.getByText("Statutory deduction from salary")).toBeDefined();
    expect(p.getByText(/Projected outcome/)).toBeDefined();
  });
});
