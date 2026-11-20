import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compareAvalancheAndSnowball } from "@flump/finance-engine";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DEBT_SNOWBALL_COPY,
  DebtSnowballCalculator,
  debtSnowballAnnouncement,
  formatPayoffDuration,
  STARTING_DEBTS,
} from "./DebtSnowballCalculator";
import { debtRow, debtRowActions, debtRowFields } from "./DebtSnowballCalculator.styles";

const outcomes = () => within(screen.getByTestId("debt-snowball-outcomes"));
const toolText = () => screen.getByTestId("debt-snowball-tool").textContent ?? "";
const debtGroup = (name: RegExp) => within(screen.getByRole("group", { name }));
const extraSlider = () => screen.getByLabelText(DEBT_SNOWBALL_COPY.extra);
/** Opens a debt's rate and minimum behind its Edit button. */
const openDebt = (n: number) =>
  fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.editLabel(n) }));

/** Types into a CurrencyInput or PercentInput and commits it, as a visitor would. */
const enter = (input: HTMLElement, value: string) => {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

describe("DebtSnowballCalculator", () => {
  it("starts from examples where the two methods give different answers (engine check)", () => {
    const engine = compareAvalancheAndSnowball(
      STARTING_DEBTS.map((d) => ({
        id: d.id,
        name: d.kind ?? d.id,
        type: d.type,
        balance: d.balance ?? 0,
        apr: d.apr ?? 0,
        minimumPayment: d.minimum ?? 0,
      })),
      75,
    );
    // The smaller debt has the lower rate, so the two orders differ.
    expect(engine.avalanche.totalInterest).toBeLessThan(engine.snowball.totalInterest);
    expect(engine.avalanche.months).toBeLessThan(engine.snowball.months);
  });

  it("shows the debt-free date and both methods' totals from the default example", () => {
    render(<DebtSnowballCalculator />);
    const cards = outcomes();
    expect(cards.getByText(DEBT_SNOWBALL_COPY.kpiDate)).toBeDefined();
    // Engine: £1,863.89 over 32 months highest rate first, £2,130.69 over 33 months smallest
    // balance first, read in whole pounds.
    const engine = compareAvalancheAndSnowball(
      STARTING_DEBTS.map((d) => ({
        id: d.id,
        name: d.kind ?? d.id,
        type: d.type,
        balance: d.balance ?? 0,
        apr: d.apr ?? 0,
        minimumPayment: d.minimum ?? 0,
      })),
      75,
    );
    // The caption gives the other method's date, in the same format as the headline.
    expect(
      cards.getByText(DEBT_SNOWBALL_COPY.dateAvalancheSooner(engine.snowball.debtFreeDate)),
    ).toBeDefined();
    expect(cards.getByText(engine.avalanche.debtFreeDate)).toBeDefined();
    expect(toolText()).not.toMatch(/Sept\b|finishes later/);
    expect(cards.getByText(DEBT_SNOWBALL_COPY.kpiAvalanche)).toBeDefined();
    expect(cards.getByText(DEBT_SNOWBALL_COPY.kpiSnowball)).toBeDefined();
    expect(cards.getByText("£1,864")).toBeDefined();
    expect(cards.getByText("£2,131")).toBeDefined();
  });

  it("keeps figures out of the captions and puts each method's time in Show details", () => {
    render(<DebtSnowballCalculator />);
    expect(outcomes().queryByText(/Paid off in/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.details }));
    const table = within(screen.getByRole("table", { name: DEBT_SNOWBALL_COPY.detailsCaption }));
    expect(table.getByText("2 years 8 months")).toBeDefined();
    expect(table.getByText("2 years 9 months")).toBeDefined();
  });

  it("shows each debt as one line until Edit opens its rate and minimum", () => {
    render(<DebtSnowballCalculator />);
    const card = debtGroup(/Debt 1/);
    expect(card.getByLabelText(DEBT_SNOWBALL_COPY.balance)).toBeDefined();
    expect(card.queryByLabelText(DEBT_SNOWBALL_COPY.rate)).toBeNull();
    expect(card.queryByLabelText(DEBT_SNOWBALL_COPY.minimum)).toBeNull();
    const edit = screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.editLabel(1) });
    expect(edit.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(edit);
    expect(edit.getAttribute("aria-expanded")).toBe("true");
    expect(card.getByLabelText(DEBT_SNOWBALL_COPY.rate)).toBeDefined();
    expect(card.getByLabelText(DEBT_SNOWBALL_COPY.minimum)).toBeDefined();
    // Two balances and the extra payment: about three inputs on arrival (P1.7).
    fireEvent.click(edit);
    expect(screen.getAllByRole("textbox").length + screen.getAllByRole("slider").length).toBe(4);
  });

  it("puts the sign-up button under the results, before the explainer and notice", () => {
    render(<DebtSnowballCalculator />);
    const cta = screen.getByRole("button", { name: "Continue to sign up" });
    const outcomesEl = screen.getByTestId("debt-snowball-outcomes");
    const notice = screen.getByTestId("projection-notice");
    expect(outcomesEl.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cta.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("hides its own title when embedded, with no skipped heading level", () => {
    const { container } = render(<DebtSnowballCalculator embedded />);
    expect(screen.queryByText(DEBT_SNOWBALL_COPY.title)).toBeNull();
    expect(screen.queryByText(DEBT_SNOWBALL_COPY.intro)).toBeNull();
    const levels = [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) =>
      Number(h.tagName[1]),
    );
    // The explainer is a drawer now, so the embedded body may hold no heading at all.
    if (levels.length > 0) expect(levels[0]).toBe(2);
    for (let i = 1; i < levels.length; i++) {
      expect((levels[i] ?? 0) - (levels[i - 1] ?? 0)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps its title outside a tool page, and the method explainer in a closed drawer", () => {
    render(<DebtSnowballCalculator />);
    expect(screen.getByRole("heading", { level: 2, name: DEBT_SNOWBALL_COPY.title })).toBeDefined();
    const drawer = screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.explainerTitle });
    expect(drawer.getAttribute("aria-expanded")).toBe("false");
    expect(toolText()).not.toContain(DEBT_SNOWBALL_COPY.explainer);
    fireEvent.click(drawer);
    expect(toolText()).toContain(DEBT_SNOWBALL_COPY.explainer);
  });

  it("labels the debts Debt 1 and Debt 2, in sentence case", () => {
    render(<DebtSnowballCalculator />);
    expect(screen.getByRole("group", { name: "Debt 1: credit card" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Debt 2: personal loan" })).toBeDefined();
    expect(toolText()).not.toMatch(/Liability|Credit Card|Personal Loan|surplus|strategy/);
  });

  it("recalculates when the extra payment changes", () => {
    render(<DebtSnowballCalculator />);
    fireEvent.change(extraSlider(), { target: { value: "0" } });
    expect(outcomes().queryByText("£1,864")).toBeNull();
    fireEvent.change(extraSlider(), { target: { value: "75" } });
    expect(outcomes().getByText("£1,864")).toBeDefined();
  });

  it("says when both methods finish in the same month", () => {
    render(<DebtSnowballCalculator />);
    // With the smaller loan at the higher rate, both orders start with the loan.
    openDebt(2);
    enter(debtGroup(/Debt 2/).getByLabelText(DEBT_SNOWBALL_COPY.rate), "29.9");
    expect(outcomes().getByText(DEBT_SNOWBALL_COPY.dateSame)).toBeDefined();
  });

  it("recalculates when a debt's balance changes and sends the new total", () => {
    const onSave = vi.fn();
    render(<DebtSnowballCalculator onSaveAndContinue={onSave} persistSeed={false} />);
    enter(debtGroup(/Debt 1/).getByLabelText(DEBT_SNOWBALL_COPY.balance), "4000");
    fireEvent.click(screen.getByRole("button", { name: "Continue to sign up" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "DEBT", totalUnsecuredDebt: 5500 }),
    );
  });

  it("clamps negative entries to zero before they reach the engine", () => {
    const onSave = vi.fn();
    render(<DebtSnowballCalculator onSaveAndContinue={onSave} persistSeed={false} />);
    openDebt(1);
    const card = debtGroup(/Debt 1/);
    enter(card.getByLabelText(DEBT_SNOWBALL_COPY.balance), "-3500");
    enter(card.getByLabelText(DEBT_SNOWBALL_COPY.rate), "-5");
    expect(toolText()).not.toMatch(/£-|-£|−£/);
    fireEvent.click(screen.getByRole("button", { name: "Continue to sign up" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ totalUnsecuredDebt: 1500 }));
  });

  it("says plainly when the payments would not pay off the debts", () => {
    render(<DebtSnowballCalculator />);
    openDebt(1);
    const card = debtGroup(/Debt 1/);
    enter(card.getByLabelText(DEBT_SNOWBALL_COPY.minimum), "1");
    enter(card.getByLabelText(DEBT_SNOWBALL_COPY.balance), "900000");
    fireEvent.change(extraSlider(), { target: { value: "0" } });
    expect(outcomes().getAllByText(DEBT_SNOWBALL_COPY.notPaidOff)).toHaveLength(3);
    expect(toolText()).not.toMatch(/Not payable|£1,456/);
  });

  it("adds and removes debts", () => {
    const onSave = vi.fn();
    render(<DebtSnowballCalculator onSaveAndContinue={onSave} persistSeed={false} />);
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.add }));
    const third = debtGroup(/^Debt 3$/);
    enter(third.getByLabelText(DEBT_SNOWBALL_COPY.balance), "1000");
    enter(third.getByLabelText(DEBT_SNOWBALL_COPY.minimum), "50");
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.removeLabel(1) }));
    expect(screen.queryByRole("group", { name: /credit card/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continue to sign up" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ totalUnsecuredDebt: 2500 }));
  });

  it("moves focus to the new row's balance when a debt is added", () => {
    render(<DebtSnowballCalculator />);
    const add = screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.add });
    add.focus();
    fireEvent.click(add);
    expect(document.activeElement).toBe(
      debtGroup(/^Debt 3$/).getByLabelText(DEBT_SNOWBALL_COPY.balance),
    );
  });

  it("keeps focus on the new field when adding the sixth debt removes the Add button", () => {
    render(<DebtSnowballCalculator />);
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.add }));
    }
    expect(screen.queryByRole("button", { name: DEBT_SNOWBALL_COPY.add })).toBeNull();
    expect(document.activeElement).toBe(
      debtGroup(/^Debt 6$/).getByLabelText(DEBT_SNOWBALL_COPY.balance),
    );
  });

  it("moves focus to the previous row's first field when a debt is removed", () => {
    render(<DebtSnowballCalculator />);
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.add }));
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.removeLabel(3) }));
    expect(document.activeElement).toBe(
      debtGroup(/^Debt 2/).getByLabelText(DEBT_SNOWBALL_COPY.balance),
    );
  });

  it("moves focus to the new first row when the first debt is removed", () => {
    render(<DebtSnowballCalculator />);
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.removeLabel(1) }));
    expect(document.activeElement).toBe(
      debtGroup(/^Debt 1: personal loan$/).getByLabelText(DEBT_SNOWBALL_COPY.balance),
    );
  });

  it("says there is no balance to repay when every balance is zero", () => {
    render(<DebtSnowballCalculator />);
    enter(debtGroup(/Debt 1/).getByLabelText(DEBT_SNOWBALL_COPY.balance), "0");
    enter(debtGroup(/Debt 2/).getByLabelText(DEBT_SNOWBALL_COPY.balance), "0");
    expect(outcomes().getByText(DEBT_SNOWBALL_COPY.nothingOwed)).toBeDefined();
    expect(outcomes().getByText(DEBT_SNOWBALL_COPY.nothingOwedDetail)).toBeDefined();
    expect(outcomes().getAllByText(DEBT_SNOWBALL_COPY.nothingOwedInterest)).toHaveLength(2);
    expect(toolText()).not.toMatch(/Paid off in 0|Not paid off/);
  });

  it("keeps at least one debt", () => {
    render(<DebtSnowballCalculator />);
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.removeLabel(2) }));
    expect(screen.queryByRole("button", { name: /Remove debt/ })).toBeNull();
    expect(screen.getAllByRole("group")).toHaveLength(1);
  });

  it("has one visible slider, no number inputs and exactly one notice", () => {
    const { container } = render(<DebtSnowballCalculator />);
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    expect(container.querySelector('input[type="number"]')).toBeNull();
    expect(screen.getAllByTestId("projection-notice")).toHaveLength(1);
  });

  it("wraps each debt's fields instead of scrolling sideways at 375px (known #10)", () => {
    const classes = debtRowFields().split(" ");
    expect(classes.some((c) => c.includes("auto-fit"))).toBe(true);
    expect(classes.some((c) => /^grid-tc_repeat\(3/.test(c))).toBe(false);
  });

  it("puts Edit and Remove under the debt name below sm, beside it from sm (P75)", () => {
    const actions = debtRowActions().split(" ");
    // Below sm: their own full-width line (row 2), so the name keeps the row's width.
    expect(actions).toContain("grid-c_1_/_-1");
    expect(actions).toContain("grid-r_2");
    expect(actions).toContain("justify-self_start");
    // From sm: beside the name, at the end of row 1.
    expect(actions).toContain("sm:grid-c_2");
    expect(actions).toContain("sm:grid-r_1");
    expect(actions).toContain("sm:justify-self_end");
    // The fields follow on the next line at both widths, full width; never beside the name.
    const fields = debtRowFields().split(" ");
    expect(fields).toContain("grid-c_1_/_-1");
    expect(fields).toContain("grid-r_3");
    expect(fields).toContain("sm:grid-r_2");
    expect(debtRow()).not.toMatch(/(^|\s)(sm|md|lg):/);
  });

  it("formats payoff durations over 24 months as years and months", () => {
    expect(formatPayoffDuration(1)).toBe("1 month");
    expect(formatPayoffDuration(24)).toBe("24 months");
    expect(formatPayoffDuration(36)).toBe("3 years");
    expect(formatPayoffDuration(37)).toBe("3 years 1 month");
  });

  it("announces both methods with the same fields", () => {
    const result = (date: string, interest: number) =>
      ({ debtFreeDate: date, totalInterest: interest, payoffAchievable: true }) as never;
    expect(
      debtSnowballAnnouncement({
        avalanche: result("May 2028", 1200.4),
        snowball: result("June 2028", 1300),
      }),
    ).toBe(
      "Illustration: highest rate first, estimated debt-free date May 2028, total interest £1,200. Smallest balance first, estimated debt-free date June 2028, total interest £1,300",
    );
  });

  it("shows one arrow on the sign-up button when the caller's label has its own", () => {
    render(<DebtSnowballCalculator ctaText="Request an invite →" />);
    expect(screen.getByRole("button", { name: "Request an invite" })).toBeDefined();
  });

  it("styles come from recipes, with no inline styles or alarm colours", () => {
    const tsx = readFileSync(join(__dirname, "DebtSnowballCalculator.tsx"), "utf8");
    const styles = readFileSync(join(__dirname, "DebtSnowballCalculator.styles.ts"), "utf8");
    expect(tsx).not.toContain("style={{");
    expect(`${tsx}${styles}`).not.toMatch(/status\.(danger|warning)|#[0-9a-f]{3,6}\b/i);
  });

  describe("short form (E42 section 4.4)", () => {
    const engineStart = () =>
      compareAvalancheAndSnowball(
        STARTING_DEBTS.map((d) => ({
          id: d.id,
          name: d.kind ?? d.id,
          type: d.type,
          balance: d.balance ?? 0,
          apr: d.apr ?? 0,
          minimumPayment: d.minimum ?? 0,
        })),
        75,
      );
    const toggle = () => screen.getByRole("button", { name: "Change the details" });

    it("shows only the two example balances and the extra payment on first view", () => {
      render(<DebtSnowballCalculator shortForm />);
      expect(screen.getByRole("group", { name: "Example debt 1: credit card" })).toBeDefined();
      expect(screen.getByRole("group", { name: "Example debt 2: personal loan" })).toBeDefined();
      expect(screen.getAllByLabelText("Balance")).toHaveLength(2);
      expect(screen.queryByLabelText("Interest rate (APR)")).toBeNull();
      expect(screen.queryByLabelText("Minimum payment a month")).toBeNull();
      expect(extraSlider()).toBeDefined();
      expect(screen.queryByRole("button", { name: /^Edit debt/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Remove debt/ })).toBeNull();
      expect(screen.queryByRole("button", { name: "Add a debt" })).toBeNull();
    });

    it("has no title, intro, sign-up button or details table, and writes no seed", () => {
      window.localStorage.clear();
      render(<DebtSnowballCalculator shortForm />);
      expect(screen.queryByText("Debt payoff methods compared")).toBeNull();
      expect(screen.queryByRole("button", { name: /Continue to sign up/ })).toBeNull();
      expect(screen.queryByRole("button", { name: "Show details" })).toBeNull();
      fireEvent.click(toggle());
      enter(screen.getAllByLabelText("Balance")[0] as HTMLElement, "5000");
      expect(window.localStorage.length).toBe(0);
      // The explainer drawer and the projection notice stay.
      expect(screen.getByRole("button", { name: "How the two methods differ" })).toBeDefined();
    });

    it("opens every row's rate, minimum and Remove, and Add a debt, behind one toggle", () => {
      render(<DebtSnowballCalculator shortForm />);
      const button = toggle();
      expect(button.getAttribute("aria-expanded")).toBe("false");
      const panel = document.getElementById(button.getAttribute("aria-controls") ?? "");
      expect(panel).not.toBeNull();
      fireEvent.click(button);
      expect(button.getAttribute("aria-expanded")).toBe("true");
      expect(screen.getAllByLabelText("Interest rate (APR)")).toHaveLength(2);
      expect(screen.getAllByLabelText("Minimum payment a month")).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: /^Remove debt/ })).toHaveLength(2);
      fireEvent.click(screen.getByRole("button", { name: "Add a debt" }));
      expect(screen.getByRole("group", { name: "Debt 3" })).toBeDefined();
      // With one debt left there is nothing to remove.
      fireEvent.click(screen.getByRole("button", { name: "Remove debt 3" }));
      fireEvent.click(screen.getByRole("button", { name: "Remove debt 2" }));
      expect(screen.queryByRole("button", { name: /^Remove debt/ })).toBeNull();
      fireEvent.click(button);
      expect(screen.queryByLabelText("Interest rate (APR)")).toBeNull();
    });

    it("shows each way's date and interest in two equal cards, neither marked as better", () => {
      render(<DebtSnowballCalculator shortForm />);
      const engine = engineStart();
      const cards = outcomes();
      const labels = within(screen.getByTestId("debt-snowball-outcomes"))
        .getAllByText(/first$/)
        .map((el) => el.textContent);
      expect(labels).toEqual(["Highest rate first", "Smallest balance first"]);
      expect(cards.getByText(engine.avalanche.debtFreeDate)).toBeDefined();
      expect(cards.getByText(engine.snowball.debtFreeDate)).toBeDefined();
      // Engine: £1,863.89 highest rate first, £2,130.69 smallest balance first, in whole pounds.
      expect(cards.getByText("Estimated interest £1,864")).toBeDefined();
      expect(cards.getByText("Estimated interest £2,131")).toBeDefined();
      expect(cards.queryByText(DEBT_SNOWBALL_COPY.kpiDate)).toBeNull();
      expect(toolText()).not.toMatch(/sooner|better|best|should/i);
    });
  });
});
