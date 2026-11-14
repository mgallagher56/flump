import { compareAvalancheAndSnowball, type DebtItem } from "@flump/finance-engine";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { monthLabel, PayExtraTool, type PayExtraToolProps } from "./PayExtraTool";

vi.mock("react-router", () => ({
  Link: ({ children, to, className }: any) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

const debts: DebtItem[] = [
  { id: "cc", name: "Card", balance: 3000, apr: 22.9, minimumPayment: 90, type: "credit_card" },
  { id: "loan", name: "Loan", balance: 4500, apr: 7.9, minimumPayment: 150, type: "loan" },
];

const renderTool = (over: Partial<PayExtraToolProps> = {}) => {
  const extraPayment = over.extraPayment ?? 0;
  const props: PayExtraToolProps = {
    comparison: compareAvalancheAndSnowball(debts, extraPayment),
    extraPayment,
    onChangeExtraPayment: vi.fn(),
    selectedStrategy: "avalanche",
    onSelectStrategy: vi.fn(),
    budgetLeftOver: 420,
    startBalance: 7500,
    ...over,
  };
  return { props, ...customRender(<PayExtraTool {...props} />) };
};

describe("PayExtraTool", () => {
  it("has one slider and one payoff-order Tabs control with parallel options (R1)", () => {
    // The two orders differ here: the smallest balance (the loan) is not the highest rate.
    const differ: DebtItem[] = [
      { id: "cc", name: "Card", balance: 3000, apr: 22.9, minimumPayment: 90, type: "credit_card" },
      { id: "loan", name: "Loan", balance: 2000, apr: 7.9, minimumPayment: 60, type: "loan" },
    ];
    renderTool({
      comparison: compareAvalancheAndSnowball(differ, 200),
      extraPayment: 200,
      startBalance: 5000,
    });
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Smallest balance first",
      "Highest rate first",
    ]);
    expect(screen.getByText("Pays the debt with the highest APR first.")).toBeDefined();
  });

  it("switching order calls back with the new order", () => {
    const { props } = renderTool();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Smallest balance first" }), { button: 0 });
    expect(props.onSelectStrategy).toHaveBeenCalledWith("snowball");
  });

  it("states only the change, with at most one supporting figure and no repeated date", () => {
    renderTool({ extraPayment: 200 });
    const outcome = screen.getByTestId("scenario-outcome");
    expect(outcome.textContent).toMatch(/^Debt-free .*(months?|years?) sooner/);
    // The slider's value pill names the amount, so the outcome does not repeat it.
    expect(outcome.textContent).not.toContain("£200 extra");
    expect(screen.queryByText("Debt-free date")).toBeNull();
    expect(outcome.querySelectorAll("dt")).toHaveLength(1);
    expect(screen.getByText("Interest compared with minimum payments only")).toBeDefined();
    expect(screen.getByText(/^£[\d,]+ less$/)).toBeDefined();
  });

  it("with no extra payment, shows a prompt instead of a figure", () => {
    renderTool();
    const outcome = screen.getByTestId("scenario-outcome");
    expect(screen.getByText("Move the slider to see what changes")).toBeDefined();
    expect(outcome.querySelector("dl")).toBeNull();
    expect(outcome.textContent).not.toMatch(/Paid off in|sooner|£/);
  });

  it("names one line by the title only, and two lines by a legend, never by plot labels", () => {
    const { unmount } = renderTool();
    expect(screen.queryByRole("list", { name: "Chart key" })).toBeNull();
    expect(screen.queryByText("Debt remaining", { selector: "text" })).toBeNull();
    unmount();
    renderTool({ extraPayment: 200 });
    const legend = screen.getByRole("list", { name: "Chart key" });
    expect(legend.textContent).toContain("With the extra payment");
    expect(legend.textContent).toContain("Minimum payments only");
    expect(screen.queryByText("Minimum payments only", { selector: "text" })).toBeNull();
  });

  it("keeps the chart summary for screen readers only, so it never repeats the outcome", () => {
    const summaryClass = () => {
      const figure = screen.getByRole("figure", { name: "How your debt comes down" });
      const id = figure.getAttribute("aria-describedby") ?? "";
      return document.getElementById(id)?.className ?? "";
    };
    const { unmount } = renderTool({ extraPayment: 0 });
    const hiddenClass = summaryClass();
    expect(screen.getByText(/^Illustration: paid off in/)).toBeDefined();
    unmount();
    renderTool({ extraPayment: 100 });
    expect(screen.getByTestId("scenario-outcome")).toBeDefined();
    expect(summaryClass()).toBe(hiddenClass);
  });

  it("says once when both orders give the same result", () => {
    const one: DebtItem[] = [
      { id: "cc", name: "Card", balance: 3000, apr: 22.9, minimumPayment: 90, type: "credit_card" },
    ];
    renderTool({ comparison: compareAvalancheAndSnowball(one, 0), startBalance: 3000 });
    expect(screen.getByText("Both orders give the same result for your debts.")).toBeDefined();
    expect(screen.queryByText("Pays the debt with the highest APR first.")).toBeNull();
  });

  it("writes months as 'Sep 2029', never 'Sept'", () => {
    expect(monthLabel(0, new Date(2029, 8, 15))).toBe("Sep 2029");
    expect(monthLabel(3, new Date(2029, 8, 15))).toBe("Dec 2029");
    expect(monthLabel(4, new Date(2029, 8, 15))).toBe("Jan 2030");
  });

  it("pre-fills what the budget leaves over with one 'Use' button that names the amount once", () => {
    const { props, container } = renderTool();
    expect(screen.queryByText(/Your budget has/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Use the £420 left over" }));
    expect(props.onChangeExtraPayment).toHaveBeenCalledWith(420);
    expect(container.textContent?.match(/£420/g)).toHaveLength(1);
  });

  it("hides the 'Use' button once the amount is used", () => {
    renderTool({ extraPayment: 420 });
    expect(screen.queryByRole("button", { name: /left over/ })).toBeNull();
  });

  it("without a budget, links to it (the caveat lives in the zone's one notice)", () => {
    renderTool({ budgetLeftOver: null });
    const link = screen.getByText("Set up your budget to see what you have left over each month");
    expect(link.closest("a")?.getAttribute("href")).toBe("/app/budget");
  });

  it("titles the chart and summarises it in one sentence, with no legend", () => {
    renderTool({ extraPayment: 100 });
    expect(screen.getByRole("figure", { name: "How your debt comes down" })).toBeDefined();
    expect(screen.getByText(/^Illustration: paid off in .+ interest, paying the/)).toBeDefined();
    expect(screen.queryByText(/\(solid\)|\(dashed\)/)).toBeNull();
  });
});
