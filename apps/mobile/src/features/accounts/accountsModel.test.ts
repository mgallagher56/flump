import { household, MONTH } from "../check-in/checkInTestData";
import {
  type AppAccount,
  type AppAccountMonth,
  buildAccountDetail,
  buildAccountsList,
  buildNetWorthHistory,
} from "./accountsModel";
import { HOMEOWNER, personaHousehold, RENTER } from "./accountsTestData";

/** The fixture profile's choices: property counts, the student loan does not. */
const BASIS = { countProperty: true, countStudentLoan: false };

const rowsOf = (h: ReturnType<typeof household>) => ({
  accounts: h.accounts as unknown as AppAccount[],
  details: h.details as unknown as AppAccountMonth[],
});

const list = (h: ReturnType<typeof household>, homeValue: number | null = null) => {
  const { accounts, details } = rowsOf(h);
  const built = buildAccountsList(accounts, details, BASIS, MONTH, homeValue);
  if (!built) throw new Error("expected a list");
  return built;
};

const names = (rows: readonly { name: string }[]) => rows.map((r) => r.name);
const balances = (rows: readonly { balance: number | undefined }[]) => rows.map((r) => r.balance);

const history = (h: ReturnType<typeof household>, latestCompletedMonth = "2026-10") => {
  const { accounts, details } = rowsOf(h);
  return buildNetWorthHistory({
    accounts,
    details,
    basis: BASIS,
    currentMonth: MONTH,
    today: "2026-11-20",
    checkInDay: null,
    latestCompletedMonth,
  });
};

describe("the accounts list (acceptance 1)", () => {
  it("the home owner: own £427,000, owe £195,600, net worth £231,400, in web's type order", () => {
    const l = list(personaHousehold(HOMEOWNER));
    // Own 3,400 + 7,600 + 10,000 + 310,000 + 96,000 = 427,000.
    expect(l.totalOwn).toBe(427000);
    // Owe 186,000 + 8,400 + 1,200 = 195,600.
    expect(l.totalOwe).toBe(195600);
    // 427,000 - 195,600 = 231,400.
    expect(l.netWorth).toBe(231400);
    // Current, Saving (two, in saved order), Pension, Property.
    expect(names(l.own)).toEqual([
      "Current account",
      "Easy access savings",
      "Cash ISA",
      "Workplace pension",
      "Home",
    ]);
    expect(balances(l.own)).toEqual([3400, 7600, 10000, 96000, 310000]);
    // Mortgage, Credit Card, Loan; each the amount owed, positive.
    expect(names(l.owe)).toEqual(["Residential mortgage", "Credit card", "Car loan"]);
    expect(balances(l.owe)).toEqual([186000, 1200, 8400]);
    expect(l.notCounted).toEqual([]);
    expect(l.leftOut).toEqual([]);
    expect(l.choicesAvailable).toBe(true);
  });

  it("the renter: own £13,500, owe £1,800, net worth £11,700, the student loan not counted", () => {
    const l = list(personaHousehold(RENTER));
    // 1,300 + 3,200 + 9,000 = 13,500; 1,800 owed; 13,500 - 1,800 = 11,700.
    expect([l.totalOwn, l.totalOwe, l.netWorth]).toEqual([13500, 1800, 11700]);
    expect(names(l.owe)).toEqual(["Credit card"]);
    expect(names(l.notCounted)).toEqual(["Student loan"]);
    expect(balances(l.notCounted)).toEqual([38500]);
    expect(l.leftOut).toEqual(["studentLoan"]);
    expect([l.countedStudentLoan, l.leftOutStudentLoan]).toEqual([false, true]);
  });

  it("a joint 50% mortgage shows half, and the totals count half (acceptance 6)", () => {
    const l = list(
      household([
        {
          name: "Mortgage",
          type: "Mortgage",
          balance: -200000,
          ownership: "joint",
          sharePercent: 50,
        },
        { name: "Home", type: "Property", balance: 300000, ownership: "joint", sharePercent: 50 },
        { name: "Current account", type: "Current", balance: 2000 },
      ]),
    );
    // Half of 200,000 owed = 100,000; half of 300,000 = 150,000.
    expect(l.owe.map((r) => [r.name, r.balance, r.ownership, r.sharePercent])).toEqual([
      ["Mortgage", 100000, "joint", 50],
    ]);
    expect(balances(l.own)).toEqual([2000, 150000]);
    // Own 2,000 + 150,000 = 152,000; owe 100,000; net worth 52,000.
    expect([l.totalOwn, l.totalOwe, l.netWorth]).toEqual([152000, 100000, 52000]);
  });

  it("an overdrawn current account sits under what you owe, as the positive amount (acceptance 7)", () => {
    const l = list(
      household([
        { name: "Current account", type: "Current", balance: -350 },
        { name: "Savings", type: "Saving", balance: 1000 },
      ]),
    );
    expect(names(l.own)).toEqual(["Savings"]);
    expect(l.owe.map((r) => [r.name, r.balance])).toEqual([["Current account", 350]]);
    // 1,000 owned; 350 owed; net worth 650.
    expect([l.totalOwn, l.totalOwe, l.netWorth]).toEqual([1000, 350, 650]);
  });

  it("a mortgage with no home asks for an estimate, unless the profile holds a home value", () => {
    const h = household([{ name: "Mortgage", type: "Mortgage", balance: -150000 }]);
    expect(list(h).leftOut).toEqual(["homeValueMissing"]);
    expect(list(h, 250000).leftOut).toEqual([]);
    // Zero is no estimate.
    expect(list(h, 0).leftOut).toEqual(["homeValueMissing"]);
  });

  it("no accounts: no list, never £0", () => {
    expect(buildAccountsList([], [], BASIS, MONTH, null)).toBeNull();
  });

  it("an unknown account type keeps its name and balance, last in its group", () => {
    const accounts: AppAccount[] = [
      { id: "a1", name: "Premium bonds", type: "Bonds from a later backend", balance: 500 },
      { id: "a2", name: "Current account", type: "Current", balance: 100 },
    ];
    const l = buildAccountsList(accounts, [], BASIS, MONTH, null);
    expect(l?.own.map((r) => [r.name, r.balance])).toEqual([
      ["Current account", 100],
      ["Premium bonds", 500],
    ]);
  });
});

describe("an account's page", () => {
  it("one balance: every row and its page's hero agree (acceptance 5)", () => {
    const h = personaHousehold(HOMEOWNER);
    const { accounts, details } = rowsOf(h);
    const l = list(h);
    for (const row of [...l.own, ...l.owe, ...l.notCounted]) {
      const detail = buildAccountDetail(row.id, accounts, details, BASIS, MONTH);
      expect([row.name, detail?.hero.balance]).toEqual([row.name, row.balance]);
    }
  });

  it("the mortgage: amount owed, its months oldest first ending on the saved balance, and the change", () => {
    const h = personaHousehold(HOMEOWNER);
    const { accounts, details } = rowsOf(h);
    const d = buildAccountDetail(h.idOf("Residential mortgage"), accounts, details, BASIS, MONTH);
    expect(d?.owed).toBe(true);
    expect(d?.hero.balance).toBe(186000);
    expect(d?.hero.month).toEqual({ month: 10, year: 2026, source: "manual" });
    // May 186,000 + 6 * 550 = 189,300 down to October 186,550, then November's saved 186,000.
    expect(d?.series.map((p) => p.value)).toEqual([
      189300, 188750, 188200, 187650, 187100, 186550, 186000,
    ]);
    expect(d?.series.at(-1)?.carried).toBe(true);
    expect([d?.endCarried, d?.firstMonth]).toEqual([true, "2026-05"]);
    // 186,000 - 189,300 = -3,300.
    expect(d?.change).toBe(-3300);
    // Highest 189,300 at the top (1), lowest 186,000 at the bottom (0); October is
    // (186,550 - 186,000) / 3,300 = 0.16666 -> 0.1667.
    expect(d?.chart.map((p) => p.fraction)).toEqual([1, 0.8333, 0.6667, 0.5, 0.3333, 0.1667, 0]);
    expect(d?.chart.map((p) => p.carried)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(d?.notCounted).toBe(false);
  });

  it("a joint account: the hero is the share, the whole beside it, the chart the whole", () => {
    const h = household([
      {
        name: "Mortgage",
        type: "Mortgage",
        balance: -200000,
        oct: -200400,
        ownership: "joint",
        sharePercent: 50,
      },
    ]);
    const { accounts, details } = rowsOf(h);
    const d = buildAccountDetail(h.idOf("Mortgage"), accounts, details, BASIS, MONTH);
    // Half of 200,000 = 100,000; the whole 200,000.
    expect([d?.hero.balance, d?.hero.whole]).toEqual([100000, 200000]);
    expect(d?.series.map((p) => p.value)).toEqual([200400, 200000]);
  });

  it("a student loan is not counted; an account with no months has no history", () => {
    const h = household([{ name: "Student loan", type: "Student Loan", balance: -38500 }]);
    const { accounts, details } = rowsOf(h);
    const d = buildAccountDetail(h.idOf("Student loan"), accounts, details, BASIS, MONTH);
    expect(d?.notCounted).toBe(true);
    expect(d?.hasMonths).toBe(false);
    expect(d?.series).toEqual([]);
    expect(d?.change).toBeNull();
  });

  it("an id that is not in the list is not found", () => {
    const { accounts, details } = rowsOf(household());
    expect(buildAccountDetail("not-an-account", accounts, details, BASIS, MONTH)).toBeNull();
  });
});

describe("net worth history (acceptance 2)", () => {
  it("the home owner: +£2,575 September to October, £15,450 since May", () => {
    const hist = history(personaHousehold(HOMEOWNER));
    // October: own 3,360 + 7,380 + 9,865 + 309,500 + 95,100 = 425,205, owe 186,550 + 8,610
    // + 1,220 = 196,380, net 228,825. September: own 423,410, owe 197,160, net 226,250.
    // 228,825 - 226,250 = 2,575.
    expect(hist.comparison?.netWorthChange).toBe(2575);
    expect(hist.comparison?.previousMonth.key).toBe("2026-09");
    expect(hist.comparison?.month.key).toBe("2026-10");
    expect(hist.recordedMonths).toBe(6);
    // May: own 3,160 + 6,280 + 9,190 + 307,000 + 90,600 = 416,230, owe 189,300 + 9,660 + 1,320
    // = 200,280, net 215,950. November carries today's 231,400: 231,400 - 215,950 = 15,450.
    expect(hist.change).toBe(15450);
    expect([hist.firstMonth, hist.endCarried, hist.earlierCarried]).toEqual([
      "2026-05",
      true,
      false,
    ]);
    expect(hist.checkedIn).toBe(false);
    expect(hist.nextCheckIn).toBeNull();
    expect(hist.currentMonthName).toBe("November");
  });

  it("the renter: +£465 September to October, £2,790 since May", () => {
    const hist = history(personaHousehold(RENTER));
    // October 1,280 + 3,050 + 8,740 - 1,835 = 11,235; September 1,260 + 2,900 + 8,480 - 1,870
    // = 10,770; 11,235 - 10,770 = 465. The student loan is left out.
    expect(hist.comparison?.netWorthChange).toBe(465);
    // May 1,180 + 2,300 + 7,440 - 2,010 = 8,910; November 11,700; 11,700 - 8,910 = 2,790.
    expect(hist.change).toBe(2790);
    expect(hist.leftOut).toEqual(["studentLoan"]);
  });

  it("changes by account: what you own first, each by name, the effect on net worth", () => {
    const hist = history(personaHousehold(RENTER));
    expect(hist.accountChanges.map((c) => [c.name, c.current, c.effect, c.isLiability])).toEqual([
      // October against September: +20, +150, +260; the card fell 35, which raised net worth.
      ["Current account", 1280, 20, false],
      ["Easy access savings", 3050, 150, false],
      ["Workplace pension", 8740, 260, false],
      ["Credit card", 1835, 35, true],
    ]);
  });

  it("two recorded months: a comparison, but below the chart's three", () => {
    const hist = history(
      household([{ name: "Current account", type: "Current", balance: 900, sep: 700, oct: 800 }]),
    );
    expect(hist.recordedMonths).toBe(2);
    // 800 - 700 = 100.
    expect(hist.comparison?.netWorthChange).toBe(100);
  });

  it("checked in this month: the next check-in date; the series ends recorded", () => {
    const hist = history(
      household([{ name: "Current account", type: "Current", balance: 900, oct: 800, nov: 900 }]),
      "2026-11",
    );
    expect(hist.checkedIn).toBe(true);
    // No check-in day chosen: the 1st of next month.
    expect(hist.nextCheckIn).toBe("2026-12-01");
    expect(hist.endCarried).toBe(false);
  });

  it("no recorded month: nothing to compare", () => {
    const hist = history(household([{ name: "Current account", type: "Current", balance: 900 }]));
    expect(hist.recordedMonths).toBe(0);
    expect(hist.comparison).toBeNull();
    expect(hist.accountChanges).toEqual([]);
  });
});
