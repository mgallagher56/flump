/**
 * Tests only: the two households of `apps/e2e/support/personas.ts` (which imports Playwright, so
 * they are copied here; `e2e/fixture-server/fixtures.ts` holds the same copy for the fixture
 * server), as the check-in test household builds them. On the fixed clock (20 November 2026) the
 * six months before November are recorded, May to October, each `balance - monthlyChange * back`
 * as personas.ts `planFor` writes them, and nothing is recorded in November. A liability is given
 * positive here and stored negative, as the backend stores it.
 */
import { household } from "../check-in/checkInTestData";

interface Persona {
  name: string;
  type: Parameters<typeof household>[0][number]["type"];
  balance: number;
  monthlyChange: number;
}

const LIABILITY = new Set(["Mortgage", "Credit Card", "Loan", "Overdraft", "Student Loan"]);

/** personas.ts `RENTER`. */
export const RENTER: readonly Persona[] = [
  { name: "Current account", type: "Current", balance: 1300, monthlyChange: 20 },
  { name: "Easy access savings", type: "Saving", balance: 3200, monthlyChange: 150 },
  { name: "Workplace pension", type: "Pension", balance: 9000, monthlyChange: 260 },
  { name: "Credit card", type: "Credit Card", balance: 1800, monthlyChange: -35 },
  { name: "Student loan", type: "Student Loan", balance: 38500, monthlyChange: 120 },
];

/** personas.ts `HOMEOWNER`. */
export const HOMEOWNER: readonly Persona[] = [
  { name: "Current account", type: "Current", balance: 3400, monthlyChange: 40 },
  { name: "Easy access savings", type: "Saving", balance: 7600, monthlyChange: 220 },
  { name: "Cash ISA", type: "Saving", balance: 10000, monthlyChange: 135 },
  { name: "Home", type: "Property", balance: 310000, monthlyChange: 500 },
  { name: "Residential mortgage", type: "Mortgage", balance: 186000, monthlyChange: -550 },
  { name: "Workplace pension", type: "Pension", balance: 96000, monthlyChange: 900 },
  { name: "Car loan", type: "Loan", balance: 8400, monthlyChange: -210 },
  { name: "Credit card", type: "Credit Card", balance: 1200, monthlyChange: -20 },
];

const stored = (type: string, value: number) => (LIABILITY.has(type) ? -value : value);

/** A persona's household: today's balances and May to October 2026 recorded. */
export function personaHousehold(persona: readonly Persona[]) {
  return household(
    persona.map((p) => {
      const months: Record<number, number> = {};
      // October is one month back, May six.
      for (let back = 1; back <= 6; back += 1) {
        months[11 - back] = stored(p.type, Math.max(0, p.balance - p.monthlyChange * back));
      }
      return { name: p.name, type: p.type, balance: stored(p.type, p.balance), months };
    }),
  );
}
