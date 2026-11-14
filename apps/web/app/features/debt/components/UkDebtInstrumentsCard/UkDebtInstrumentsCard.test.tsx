import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import customRender from "~/testUtils/customRender";
import { UkDebtInstrumentsCard } from "./UkDebtInstrumentsCard";

const panel = (name: RegExp) => within(screen.getByRole("tabpanel", { name }));

describe("UkDebtInstrumentsCard", () => {
  it("has no heading of its own above level 3 (the drawer title names it)", () => {
    customRender(<UkDebtInstrumentsCard />);
    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 3, name: "When the 0% deal ends" })).toBeDefined();
  });

  it("exposes four tabs and switches panels (arrow keys are covered by the Tabs primitive)", () => {
    customRender(<UkDebtInstrumentsCard />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Arranged overdraft cost/ }), {
      button: 0,
    });
    expect(screen.getByRole("tabpanel", { name: /Arranged overdraft cost/ })).toBeDefined();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Car finance final payment/ }), {
      button: 0,
    });
    expect(
      screen.getByRole("tab", { name: /Car finance final payment/ }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("states the days left on a 0% deal as a plain estimate, with no alarm styling", () => {
    customRender(<UkDebtInstrumentsCard />);
    const p = panel(/When a 0% deal ends/);
    fireEvent.change(p.getByLabelText("Months left on the 0% deal"), { target: { value: "1" } });
    expect(p.getByText(/are left on the 0% deal\. Estimate:/)).toBeDefined();
    expect(p.queryByText(/alert|diagnosis|revert/i)).toBeNull();
  });

  it("clearing a figure shows no result instead of treating it as 0", () => {
    customRender(<UkDebtInstrumentsCard />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Arranged overdraft cost/ }), {
      button: 0,
    });
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

  it("calculates the overdraft cost from the balance and EAR, with no unbacked market rate", () => {
    customRender(<UkDebtInstrumentsCard />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Arranged overdraft cost/ }), {
      button: 0,
    });
    const p = panel(/Arranged overdraft cost/);
    expect(p.queryByText(/UK standard/)).toBeNull();
    fireEvent.change(p.getByLabelText("Average arranged overdraft balance"), {
      target: { value: "1500" },
    });
    fireEvent.change(p.getByLabelText(/Overdraft interest rate \(EAR\)/), {
      target: { value: "40" },
    });
    expect(p.getByText("£600 a year")).toBeDefined();
  });

  it("states the final payment result as a fact", () => {
    customRender(<UkDebtInstrumentsCard />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Car finance final payment/ }), {
      button: 0,
    });
    const p = panel(/Car finance final payment/);
    fireEvent.change(p.getByLabelText("Months left in the agreement"), { target: { value: "18" } });
    expect(p.getByText(/Saving £\d+ a month for the remaining term would add up to/)).toBeDefined();
  });

  it("switches student loan plan and shows the repayment taken from pay", () => {
    customRender(<UkDebtInstrumentsCard />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Student loan outlook/ }), { button: 0 });
    const p = panel(/Student loan outlook/);
    fireEvent.change(p.getByLabelText("Student loan plan"), { target: { value: "plan1" } });
    fireEvent.change(p.getByLabelText("Yearly salary before tax"), {
      target: { value: "120000" },
    });
    expect(p.getByText("Repayment taken from your pay")).toBeDefined();
    expect(p.getByText(/in this estimate the balance is/)).toBeDefined();
  });
});
