import { expectPageRules } from "@repo/ui/testing";
import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { PensionSummary, type PensionSummaryProps } from "./PensionSummary";

vi.mock("react-router", () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

const props: PensionSummaryProps = {
  totalValue: 96000,
  potsCount: 1,
  monthlyTotal: 532,
  onAddPot: () => {},
};

describe("<PensionSummary />", () => {
  test("the saved pot total is the one hero and what goes in each month the one KPI", () => {
    const { container, getAllByRole, queryByText } = customRender(<PensionSummary {...props} />);
    const heroes = container.querySelectorAll("[data-tone='hero']");
    expect(heroes).toHaveLength(1);
    expect(heroes[0]?.textContent).toContain("Total in your pots");
    expect(heroes[0]?.textContent).toContain("£96,000");
    expect(heroes[0]?.textContent).not.toMatch(/estimate/i);
    const cards = Array.from(container.querySelectorAll("[data-density='compact'] > *")).map(
      (card) => card.textContent ?? "",
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]).toContain("Going in each month");
    expect(queryByText("Income at retirement")).toBeNull();
    expect(queryByText("Retirement age")).toBeNull();
    expect(queryByText("Estimate")).toBeNull();
    expect(getAllByRole("group").length).toBeGreaterThan(0);
    // Hero plus one KPI: two figures, none in a caption.
    expectPageRules(container, { maxFigures: 2 });
  });

  test("captions carry no figures", () => {
    const { getByText } = customRender(<PensionSummary {...props} />);
    expect(getByText("You and your employer").textContent).not.toMatch(/£|%|\d/);
  });

  test("with no pots, the hero is a prompt with one action, never zero", () => {
    const onAddPot = vi.fn();
    const { container, getByRole, queryByText } = customRender(
      <PensionSummary {...props} onAddPot={onAddPot} potsCount={0} totalValue={0} />,
    );
    expect(container.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    expect(queryByText("£0")).toBeNull();
    fireEvent.click(getByRole("button", { name: "Add pension pot" }));
    expect(onAddPot).toHaveBeenCalled();
  });

  test("rates that are not set make the monthly total one prompt for the rates, never 5% and 3%", () => {
    const { getByText, queryByText } = customRender(
      <PensionSummary {...props} monthlyTotal={null} ratesNotSet />,
    );
    expect(getByText("Add your contribution rates to see what goes in each month")).toBeDefined();
    expect(getByText("Add your rates").getAttribute("href")).toBe("/app/pension#pension-details");
    expect(queryByText(/Assumed/)).toBeNull();
    expect(queryByText("£0")).toBeNull();
  });

  test("chosen rates read as chosen, with no assumed caption", () => {
    const { getByText, queryByText } = customRender(<PensionSummary {...props} />);
    expect(getByText("You and your employer")).toBeDefined();
    expect(queryByText(/Assumed/)).toBeNull();
  });

  test("an unknown monthly total becomes one prompt", () => {
    const { getByText, queryByText } = customRender(
      <PensionSummary {...props} monthlyTotal={null} />,
    );
    expect(getByText("Add your salary to see what goes in each month")).toBeDefined();
    expect(queryByText("Going in each month")).toBeNull();
  });
});
