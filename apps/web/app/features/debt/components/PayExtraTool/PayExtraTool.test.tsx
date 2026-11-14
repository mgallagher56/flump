import { compareAvalancheAndSnowball, type DebtItem } from "@flump/finance-engine";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { PayExtraTool, type PayExtraToolProps } from "./PayExtraTool";

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
    renderTool();
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

  it("states how much sooner the debts are paid off, with 2 supporting figures", () => {
    renderTool({ extraPayment: 200 });
    expect(screen.getByTestId("scenario-outcome").textContent).toMatch(
      /With £200 extra a month.*Debt-free .*(months?|years?) sooner/,
    );
    expect(screen.getByText("Debt-free date")).toBeDefined();
    expect(screen.getByText("Interest compared with minimum payments only")).toBeDefined();
    expect(screen.getByText(/^£[\d,]+ less$/)).toBeDefined();
  });

  it("with no extra payment, says so and shows no saving", () => {
    renderTool();
    expect(screen.getByText("With no extra payment")).toBeDefined();
    expect(screen.getByText("No change")).toBeDefined();
  });

  it("pre-fills what the budget leaves over with a 'Use' button", () => {
    const { props } = renderTool();
    expect(screen.getByText("Your budget has £420 left over each month.")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Use £420 left over" }));
    expect(props.onChangeExtraPayment).toHaveBeenCalledWith(420);
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
