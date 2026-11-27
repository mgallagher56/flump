// @vitest-environment node
/**
 * Overdrawn accounts on Home's "What you owe" and on the accounts list (E12 S8 device check, ruled
 * by `fable-decider` on 27 November 2026, DECISIONS.md). Home's owed card counts cards, loans,
 * Overdraft accounts and overdrawn Current accounts only, and shows whenever that total is above
 * £0, with or without a debt account. A savings, investment, pension or property balance below
 * zero is a balance to check, not borrowing: it stays out of the owed card, net worth still counts
 * it, and the list keeps it under what you owe with a flag for its note. Each case checks web's
 * path (the picture's `consumerDebtTotal` into `selectHomeStrip`) and mobile's
 * (`selectHomeStripFromRows`) give the same card.
 */
import { describe, expect, it } from "vitest";
import { selectAccountGroups } from "./account-balance.js";
import { selectHomeStrip, selectHomeStripFromRows } from "./home-strip.js";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import { buildFinancialPicture, financialPictureInputFromRows } from "./picture/build.js";
import { selectDebtSummary } from "./picture/selectors/debt-summary.js";
import { selectConsumerDebtTotal, selectNetWorth } from "./picture/selectors/portfolio-totals.js";
import { PortfolioSnapshot } from "./portfolio.js";

type Row = Record<string, unknown>;
const snap = (accounts: Row[]) => new PortfolioSnapshot(accounts as never, []);
const TODAY = new Date("2026-11-27T12:00:00Z");

const CARD = { id: "card", name: "Card", type: "Credit Card", balance: 1800 };
const current = (balance: number, extra: Row = {}) => ({
  id: "cur",
  name: "Current",
  type: "Current",
  balance,
  ...extra,
});

/** Home's second card on web (the picture's figure) and on mobile (from the rows). */
function ownedCards(accounts: Row[]) {
  const picture = buildFinancialPicture(
    financialPictureInputFromRows({
      profile: null,
      accounts: accounts as never,
      budgetEntries: [],
    }),
    { asOf: TODAY },
  );
  const web = selectHomeStrip({
    budget: { status: "unknown" } as never,
    consumerDebt: picture.consumerDebtTotal,
    pensionPot: null,
  }).second;
  const mobile = selectHomeStripFromRows({ accounts: accounts as never, today: TODAY }).second;
  return { web, mobile };
}

const owed = (figure: number) => ({ kind: "owed", figure });

describe("Home's What you owe (ruled 27 November 2026)", () => {
  it("an overdrawn current account with no debt account is owed; the Debt summary stays null", () => {
    // Current at -300 alone: owed 300 (was null while a debt account was required).
    const accounts = [current(-300)];
    expect(selectConsumerDebtTotal(snap(accounts))).toBe(300);
    expect(selectDebtSummary(snap(accounts), TODAY)).toBeNull();
    expect(ownedCards(accounts)).toEqual({ web: owed(300), mobile: owed(300) });
  });

  it("a card of 1,800 and a current account at -300 owe 2,100", () => {
    // 1,800 + 300 = 2,100.
    const accounts = [CARD, current(-300)];
    expect(selectConsumerDebtTotal(snap(accounts))).toBe(2100);
    expect(ownedCards(accounts)).toEqual({ web: owed(2100), mobile: owed(2100) });
  });

  it("savings at -150 beside a card: the card only is owed; net worth still falls by 150", () => {
    const savings = { id: "sav", name: "Savings", type: "Saving", balance: -150 };
    const accounts = [CARD, savings];
    // Owed: the card's 1,800, not 1,950.
    expect(selectConsumerDebtTotal(snap(accounts))).toBe(1800);
    expect(ownedCards(accounts)).toEqual({ web: owed(1800), mobile: owed(1800) });
    // Net worth: 0 - 1,800 - 150 = -1,950, the overdrawn savings counted as a liability.
    expect(selectNetWorth(snap(accounts), DEFAULT_NET_WORTH_BASIS).netWorth).toBe(-1950);
    // The list keeps it under what you owe, at 150, flagged for its note.
    const groups = selectAccountGroups([{ ...savings }, { ...CARD }], []);
    expect(groups.owe.find((r) => r.id === "sav")).toEqual({
      ...savings,
      balance: 150,
      belowZeroToCheck: true,
    });
    expect(groups.owe.find((r) => r.id === "card")).toEqual(CARD);
  });

  it("a pension at -5,000 alone: no owed card, and its row is flagged", () => {
    const pension = { id: "pen", name: "Pension", type: "Pension", balance: -5000 };
    expect(selectConsumerDebtTotal(snap([pension]))).toBeNull();
    // No owed card on either app (the pension's own card is not this ruling's).
    const cards = ownedCards([pension]);
    expect([cards.web.kind, cards.mobile.kind].includes("owed")).toBe(false);
    expect(selectAccountGroups([pension], []).owe).toEqual([
      { ...pension, balance: 5000, belowZeroToCheck: true },
    ]);
  });

  it("an overdrawn current account is owed on the list with no flag", () => {
    expect(selectAccountGroups([current(-300)], []).owe).toEqual([current(300)]);
  });

  it("a current account at exactly 0 and a card at 0 give nothing owed", () => {
    const accounts = [current(0), { ...CARD, balance: 0 }];
    expect(selectConsumerDebtTotal(snap(accounts))).toBeNull();
    expect(ownedCards(accounts)).toEqual({ web: { kind: "none" }, mobile: { kind: "none" } });
  });

  it("a joint current account at a 50% share owes half its overdrawn amount", () => {
    // -300 whole, 50% share: 150.
    const accounts = [current(-300, { ownership: "joint", sharePercent: 50 })];
    expect(selectConsumerDebtTotal(snap(accounts))).toBe(150);
    expect(ownedCards(accounts)).toEqual({ web: owed(150), mobile: owed(150) });
  });
});
