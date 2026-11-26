// @vitest-environment node
import {
  DEFAULT_NET_WORTH_BASIS,
  type NetWorthBasis,
  PortfolioSnapshot,
  selectNetWorth,
} from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { buildSnapshotHistory } from "../snapshot/snapshotModel";
import { netWorthDelta, priorNetWorth } from "./netWorthDelta";

/**
 * The Home hero's change line end to end, as the loader and the dashboard build it: today's figure
 * from the picture's selector, the series under the same choices, the month the loader picks, and
 * the words. Written before the change moved into the engine (E12 S5) and run against the old web
 * code first, so the move is pinned to give the same line in every case below.
 */

const CURRENT = "c0000000-0000-4000-8000-000000000001";
const HOME = "c0000000-0000-4000-8000-000000000002";
const MORTGAGE = "c0000000-0000-4000-8000-000000000003";
const LOAN = "c0000000-0000-4000-8000-000000000004";

const accountsWith = (currentBalance: number) => [
  { id: CURRENT, name: "Current account", type: "Current", balance: currentBalance },
  { id: HOME, name: "Home", type: "Property", balance: 300000 },
  { id: MORTGAGE, name: "Mortgage", type: "Mortgage", balance: -180000 },
  { id: LOAN, name: "Student loan", type: "Student Loan", balance: -19800 },
];

const row = (accountId: string, year: number, month: number, value: number) => ({
  accountId,
  year,
  month,
  value,
});

const AUGUST = [
  row(CURRENT, 2026, 8, 1000),
  row(HOME, 2026, 8, 300000),
  row(MORTGAGE, 2026, 8, -181000),
  row(LOAN, 2026, 8, -20000),
];
const OCTOBER = [
  row(CURRENT, 2026, 10, 1200),
  row(HOME, 2026, 10, 300000),
  row(MORTGAGE, 2026, 10, -180500),
  row(LOAN, 2026, 10, -19900),
];
const NOVEMBER = [
  row(CURRENT, 2026, 11, 1500),
  row(HOME, 2026, 11, 300000),
  row(MORTGAGE, 2026, 11, -180000),
  row(LOAN, 2026, 11, -19800),
];

function heroChange(
  details: ReturnType<typeof row>[],
  {
    currentBalance = 1500,
    basis = DEFAULT_NET_WORTH_BASIS,
    unknown = false,
  }: { currentBalance?: number; basis?: NetWorthBasis; unknown?: boolean } = {},
) {
  const accounts = accountsWith(currentBalance);
  const netWorth = unknown
    ? null
    : selectNetWorth(new PortfolioSnapshot(accounts, details), basis).netWorth;
  const history = buildSnapshotHistory(accounts, details, "2026-11", basis);
  const prior = priorNetWorth(netWorth, history.series, "2026-11");
  return netWorthDelta(netWorth, prior, "2026-11");
}

describe("the hero's change line (characterisation)", () => {
  it("compares with the latest recorded month while this month is not recorded yet", () => {
    // Student loan left out by default. Today 1,500 + 300,000 - 180,000 = 121,500.
    // October 1,200 + 300,000 - 180,500 = 120,700. 121,500 - 120,700 = 800.
    expect(heroChange([...AUGUST, ...OCTOBER])).toEqual({
      direction: "up",
      text: "£800 since October",
      polarity: "asset",
    });
  });

  it("still compares with last month once this month is recorded", () => {
    // November's rows equal today's balances; the comparison stays October: £800.
    expect(heroChange([...AUGUST, ...OCTOBER, ...NOVEMBER])?.text).toBe("£800 since October");
  });

  it("skips a month with no check-in", () => {
    // September and October not recorded: August 1,000 + 300,000 - 181,000 = 120,000.
    // 121,500 - 120,000 = 1,500.
    expect(heroChange(AUGUST)?.text).toBe("£1,500 since August");
  });

  it("has no line in the first recorded month", () => {
    expect(heroChange(NOVEMBER)).toBeNull();
  });

  it("reads a fall without a sign, the arrow carrying the direction", () => {
    // Current account 500 today: 500 + 300,000 - 180,000 = 120,500. 120,500 - 120,700 = -200.
    expect(heroChange([...AUGUST, ...OCTOBER], { currentBalance: 500 })).toEqual({
      direction: "down",
      text: "£200 since October",
      polarity: "asset",
    });
  });

  it("says the same when nothing changed", () => {
    // Current account 700 today: 700 + 300,000 - 180,000 = 120,700, the same as October.
    expect(heroChange([...AUGUST, ...OCTOBER], { currentBalance: 700 })).toEqual({
      direction: "flat",
      text: "Same as October",
      polarity: "asset",
    });
  });

  it("follows the property choice on both sides", () => {
    // Property off leaves out the home and its mortgage: today 1,500, October 1,200: £300.
    const basis = { countProperty: false, countStudentLoan: false };
    expect(heroChange([...AUGUST, ...OCTOBER], { basis })?.text).toBe("£300 since October");
  });

  it("follows the student loan choice on both sides", () => {
    // Loan counted: today 121,500 - 19,800 = 101,700; October 120,700 - 19,900 = 100,800: £900.
    const basis = { countProperty: true, countStudentLoan: true };
    expect(heroChange([...AUGUST, ...OCTOBER], { basis })?.text).toBe("£900 since October");
  });

  it("has no line when today's figure is unknown", () => {
    expect(heroChange([...AUGUST, ...OCTOBER], { unknown: true })).toBeNull();
  });
});
