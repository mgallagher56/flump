import { describe, expect, it } from "vitest";
import { validateSignConvention } from "../../core/sign-enforcement.js";
import { CsvAmountError, parseBankCsvContent } from "./csv.js";

describe("banking server: parseBankCsvContent", () => {
  const monzoCsv = `Transaction ID,Date,Time,Type,Name,Emoji,Category,Amount,Currency,Local amount,Local currency,Notes and #tags,Address,Description
tx_001,01/02/2026,14:22:00,Card Payment,Tesco Express,,Groceries,-24.50,GBP,-24.50,GBP,,,Tesco Express London
tx_002,02/02/2026,08:30:00,Faster payment,ACME Corp Payroll,,Income,2600.00,GBP,2600.00,GBP,,,Salary February
tx_003,03/02/2026,10:00:00,Direct Debit,Camden Council,,Bills,-160.00,GBP,-160.00,GBP,,,Council Tax
tx_004,04/02/2026,12:00:00,Direct Debit,Octopus Energy,,Bills,-110.00,GBP,-110.00,GBP,,,Energy Bill`;

  const starlingCsv = `Date,Counter Party,Reference,Type,Amount (GBP),Balance (GBP),Spending Category
05/02/2026,Sainsbury's,Supermarket spend,POS Card,-35.20,1200.00,Groceries
06/02/2026,Barclaycard,Credit Card Repayment,Faster Payment,-250.00,950.00,Bills`;

  const amexCsv = `Date,Description,Card Member,Account #,Amount
07/02/2026,Amazon UK,John Doe,12345,45.99
08/02/2026,PAYMENT RECEIVED - THANK YOU,John Doe,12345,-500.00`;

  it("parses Monzo CSV and categorizes transactions correctly", () => {
    const { account, transactions } = parseBankCsvContent(monzoCsv);
    expect(account.institutionName).toBe("Monzo");
    expect(transactions.length).toBe(4);

    const salary = transactions.find((t) => t.merchantOrDescription.includes("ACME"));
    expect(salary?.amountGbp).toBe(2600);
    expect(salary?.flumpBucket).toBe("INCOME");

    const council = transactions.find((t) => t.merchantOrDescription.includes("Camden Council"));
    expect(council?.amountGbp).toBe(-160);
    expect(council?.flumpBucket).toBe("PRIORITY_HOUSING_COUNCIL_ENERGY");
  });

  it("parses Starling CSV correctly", () => {
    const { account, transactions } = parseBankCsvContent(starlingCsv);
    expect(account.institutionName).toBe("Starling");
    expect(transactions.length).toBe(2);

    const repayment = transactions.find((t) => t.merchantOrDescription.includes("Barclaycard"));
    expect(repayment?.flumpBucket).toBe("DEBT_MINIMUM_REPAYMENT");
  });

  it("parses Amex CSV inverting positive charges to negative Flump outflows", () => {
    const { account, transactions } = parseBankCsvContent(amexCsv, "amex-acc", "CREDIT_CARD");
    expect(account.institutionName).toBe("American Express");
    expect(validateSignConvention(account)).toBe(true);

    const amazon = transactions.find((t) => t.merchantOrDescription.includes("Amazon"));
    // In Amex statement, 45.99 is a charge -> Flump must be -45.99
    expect(amazon?.amountGbp).toBe(-45.99);

    const payment = transactions.find((t) => t.merchantOrDescription.includes("PAYMENT"));
    // In Amex statement, -500 is a payment reducing debt -> Flump inflow +500
    expect(payment?.amountGbp).toBe(500);
  });

  it("parses a generic HSBC-style statement (date, description, amount, balance)", () => {
    const csv = `Date,Description,Amount,Balance
09/02/2026,Co-op Food,-12.30,500.00
10/02/2026,Salary,2000.00,2487.70`;
    const { transactions } = parseBankCsvContent(csv);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]?.amountGbp).toBe(-12.3);
    expect(transactions[1]?.amountGbp).toBe(2000);
  });

  it("accepts amounts with a currency symbol and thousands separator", () => {
    const csv = `Date,Description,Amount,Balance
09/02/2026,Salary,"£1,234.50",500.00`;
    const { transactions } = parseBankCsvContent(csv);
    expect(transactions[0]?.amountGbp).toBe(1234.5);
  });

  it.each([
    ["an empty amount cell", "10/02/2026,Mystery,,500.00"],
    ["an unreadable amount cell", "10/02/2026,Mystery,SECRET-n/a,500.00"],
    ["a lone minus sign", "10/02/2026,Mystery,-,500.00"],
  ])("rejects %s with the data row number and no cell content", (_, badRow) => {
    const csv = `Date,Description,Amount,Balance
09/02/2026,Co-op Food,-12.30,500.00
${badRow}`;
    let error: unknown;
    try {
      parseBankCsvContent(csv);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(CsvAmountError);
    expect((error as CsvAmountError).row).toBe(2);
    expect((error as Error).message).toMatch(/row 2/);
    expect((error as Error).message).not.toContain("SECRET");
    expect((error as Error).message).not.toContain("Mystery");
  });

  it("rejects a Monzo row whose amount column is missing", () => {
    const csv = `Transaction ID,Date,Time,Type,Name,Emoji,Category,Amount,Currency,Local amount,Local currency,Notes and #tags,Address,Description
tx_001,01/02/2026,14:22:00,Card Payment,Tesco Express,,Groceries`;
    expect(() => parseBankCsvContent(csv)).toThrow(CsvAmountError);
  });
});
