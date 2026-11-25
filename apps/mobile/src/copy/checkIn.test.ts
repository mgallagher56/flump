import { calculateCheckInBalance } from "@flump/finance-engine/check-in";
import {
  calculatedExplain,
  cardSummary,
  changeText,
  netWorthChangeText,
  progressText,
  rowLine,
} from "./checkIn";

describe("check-in words", () => {
  it("names the position as web's card does", () => {
    expect(progressText(2, 6)).toBe("Account 2 of 6");
  });

  it("reads a card as one sentence", () => {
    expect(
      cardSummary({
        name: "Current account",
        figure: 1204,
        lastMonth: "2026-10",
        position: 2,
        total: 6,
      }),
    ).toBe("Current account, £1,204, recorded in October 2026, account 2 of 6");
    expect(
      cardSummary({ name: "New ISA", figure: null, lastMonth: null, position: 1, total: 1 }),
    ).toBe("New ISA, no balance recorded yet, account 1 of 1");
  });

  it("the row line has three cases, as web's checkInLine", () => {
    expect(rowLine("2026-11", "2026-10")).toBe("Last check-in: October 2026");
    expect(rowLine("2026-11", null)).toBe("No monthly check-in yet");
    expect(rowLine("2026-11", undefined)).toBe("Record your November balances");
  });

  it.each([
    [4, "4%"],
    [4.5, "4.5%"],
    [4.25, "4.25%"],
  ])("states a %s rate with its own decimals", (rate, text) => {
    const calc = calculateCheckInBalance({
      type: "Loan",
      interestRate: rate,
      monthlyPayment: 1250,
      base: { value: 10000, month: "2026-10" },
      month: "2026-11",
    });
    expect(calc && calculatedExplain(calc)).toBe(
      `From your interest rate of ${text} and monthly payment of £1,250 since October 2026.`,
    );
  });

  it("states a change in the same words both ways", () => {
    expect(netWorthChangeText(1250.4, "2026-10")).toBe("Up £1,250 on October 2026.");
    expect(netWorthChangeText(-300, "2026-10")).toBe("Down £300 on October 2026.");
    expect(netWorthChangeText(0.3, "2026-10")).toBe("The same as October 2026.");
    expect(netWorthChangeText(null, "2026-10")).toBeNull();
  });

  it("a change reads old to new in whole pounds", () => {
    expect(changeText(3400, 3450.6)).toBe("£3,400 to £3,451");
    expect(changeText(null, 200)).toBe("£200");
  });
});
