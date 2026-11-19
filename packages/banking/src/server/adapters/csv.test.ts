import { describe, expect, it } from "vitest";
import { validateSignConvention } from "../../core/sign-enforcement.js";
import {
  CsvAmountError,
  categorizeUkMerchant,
  detectBankCsvFormat,
  parseBankCsvContent,
} from "./csv.js";

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

  it("rounds a credit card statement's balance and amount owed to whole pence", () => {
    // Two charges of £0.10 and £0.20 are £0.30 owed. In binary floating point 0.1 + 0.2 is
    // 0.30000000000000004, so both figures must be rounded to pence: owed 0.3, net worth -0.3.
    const csv = `Date,Description,Card Member,Account #,Amount
07/02/2026,Shop A,Card Holder,12345,0.10
08/02/2026,Shop B,Card Holder,12345,0.20`;
    const { account } = parseBankCsvContent(csv, "amex-acc", "CREDIT_CARD");
    expect(account.principalOwedGbp).toBe(0.3);
    expect(account.netWorthImpactGbp).toBe(-0.3);
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

describe("categorizeUkMerchant", () => {
  it.each([
    "Tesco",
    "Sainsbury's",
    "ASDA",
    "Morrisons",
    "Aldi",
    "Lidl",
    "Waitrose",
    "Marks & Spencer",
    "M&S Simply Food",
    "Local Pharmacy",
    "Boots",
    "Fibre Broadband",
    "BT Group",
    "Vodafone",
    "EE Mobile",
    "O2",
    "Three",
  ])("files %s under essential bills and groceries", (merchant) => {
    expect(categorizeUkMerchant(merchant, -10)).toBe("ESSENTIAL_BILLS_GROCERIES");
  });

  it.each([
    "Barclaycard",
    "American Express",
    "Amex Payment",
    "Capital One",
    "MBNA",
    "Loan Payment",
    "Klarna",
    "Clearpay",
  ])("files %s under debt minimum repayments", (merchant) => {
    expect(categorizeUkMerchant(merchant, -10)).toBe("DEBT_MINIMUM_REPAYMENT");
  });

  it.each([
    "Vanguard",
    "Hargreaves Lansdown",
    "HL SIPP",
    "Trading 212",
    "Freetrade",
    "Monzo Pot",
    "ISA Transfer",
  ])("files %s under savings and investment transfers", (merchant) => {
    expect(categorizeUkMerchant(merchant, -10)).toBe("SAVINGS_INVESTMENTS_TRANSFER");
  });

  it("files an unrecognised spend under discretionary wants", () => {
    expect(categorizeUkMerchant("Cinema", -10)).toBe("DISCRETIONARY_WANTS");
  });

  it("does not treat a zero amount as income", () => {
    // Income is money in (above zero); a zero line is filed by its merchant.
    expect(categorizeUkMerchant("Cinema", 0)).toBe("DISCRETIONARY_WANTS");
  });

  it("uses the provider's own category text too", () => {
    expect(categorizeUkMerchant("DD 123", -50, "Mortgage")).toBe("PRIORITY_HOUSING_COUNCIL_ENERGY");
  });
});

describe("detectBankCsvFormat", () => {
  it.each([
    ["Transaction ID,Date,Name,Amount,Notes and #tags,Monzo category", "monzo"],
    ["Date,Description,Amount,Notes and #tags", "generic"],
    ["Date,Monzo reference,Amount", "generic"],
    ["Date,Starling Reference,Amount", "starling"],
    ["Date,Reference,Amount", "generic"],
    ["Starling,Date,Amount", "generic"],
    ["Date,Description,Card Member,Amount", "amex"],
    ["Date,Description,Amount,Balance", "hsbc"],
    ["Date,Description,Amount", "generic"],
    ["Date,Amount,Balance", "generic"],
    ["Description,Amount,Balance", "generic"],
  ] as const)("reads %j as %s", (header, format) => {
    expect(detectBankCsvFormat(header)).toBe(format);
  });
});

describe("parseBankCsvContent details", () => {
  const monzoHeader =
    "Transaction ID,Date,Time,Type,Name,Emoji,Category,Amount,Currency,Local amount,Local currency,Notes and #tags,Address,Description";

  it("builds the account and each transaction field from a Monzo statement", () => {
    const csv = `${monzoHeader}
tx_001,01/02/2026,14:22:00,Card Payment,Tesco Express,,Groceries,-24.50,GBP,-24.50,GBP,,,Tesco Express London
tx_002,02/02/2026,08:30:00,Faster payment,ACME Corp Payroll,,Income,2600.00,GBP,2600.00,GBP,,,Salary
tx_003,03/02/2026,10:00:00,Direct Debit,Camden Council,,Bills,-160.00,GBP,-160.00,GBP,,,Council Tax
tx_004,04/02/2026,12:00:00,Direct Debit,Octopus Energy,,Bills,-110.00,GBP,-110.00,GBP,,,Energy`;
    const { account, transactions } = parseBankCsvContent(csv);
    // Balance: -24.50 + 2600.00 - 160.00 - 110.00 = 2305.50.
    expect(account).toMatchObject({
      externalAccountId: "csv-account-default",
      provider: "csv",
      category: "CURRENT",
      currency: "GBP",
      netWorthImpactGbp: 2305.5,
      principalOwedGbp: 0,
      isTaxFreeIsaWrapper: false,
    });
    expect(account.name).toContain("Monzo");
    expect(transactions[0]).toEqual({
      // Row 1, dated 01/02/2026: the id keeps the row number and the date digits.
      externalTransactionId: "csv-tx-1-01022026",
      externalAccountId: "csv-account-default",
      postedDate: "2026-02-01",
      merchantOrDescription: "Tesco Express",
      amountGbp: -24.5,
      flumpBucket: "ESSENTIAL_BILLS_GROCERIES",
      isRecurringContract: false,
      rawProviderCategory: "Groceries",
    });
    // Council tax is a priority bill, so it is a recurring contract.
    expect(transactions[2]?.isRecurringContract).toBe(true);
  });

  it("reads Starling and Amex dates, the last column and Amex's fixed category", () => {
    const starling =
      parseBankCsvContent(`Date,Counter Party,Reference,Type,Amount (GBP),Balance (GBP),Spending Category
05/02/2026,Sainsbury's,Supermarket spend,POS Card,-35.20,1200.00, Groceries`);
    expect(starling.transactions[0]).toMatchObject({
      postedDate: "2026-02-05",
      merchantOrDescription: "Sainsbury's",
      rawProviderCategory: "Groceries",
    });
    const amex = parseBankCsvContent(`Date,Description,Card Member,Account #,Amount
07/02/2026,Amazon UK,A Member,12345,45.99`);
    expect(amex.transactions[0]).toMatchObject({
      postedDate: "2026-02-07",
      rawProviderCategory: "Credit Card",
    });
  });

  it("names a generic statement's account HSBC and trims cells", () => {
    const { account, transactions } = parseBankCsvContent(`Date,Description,Amount,Balance
09/02/2026, Co-op Food ,-12.30,500.00`);
    expect(account.institutionName).toBe("HSBC");
    expect(transactions[0]).toMatchObject({
      postedDate: "2026-02-09",
      merchantOrDescription: "Co-op Food",
    });
  });

  it("falls back to the description, then a placeholder, when the name is blank", () => {
    const monzo = parseBankCsvContent(`${monzoHeader}
tx_001,01/02/2026,14:22:00,Card Payment,,,Groceries,-24.50,GBP,-24.50,GBP,,,Corner Shop London
tx_002,01/02/2026,14:22:00,Card Payment,,,Groceries,-1.00,GBP`);
    expect(monzo.transactions[0]?.merchantOrDescription).toBe("Corner Shop London");
    expect(monzo.transactions[1]?.merchantOrDescription).not.toBe("");
    const starling = parseBankCsvContent(`Date,Counter Party,Reference,Type,Amount (GBP)
05/02/2026,,,POS Card,-35.20`);
    expect(starling.transactions[0]?.merchantOrDescription).not.toBe("");
    const amex = parseBankCsvContent(`Date,Description,Card Member,Account #,Amount
07/02/2026,,A Member,12345,45.99`);
    expect(amex.transactions[0]?.merchantOrDescription).not.toBe("");
    const generic = parseBankCsvContent(`Date,Description,Amount
09/02/2026,,-12.30`);
    expect(generic.transactions[0]?.merchantOrDescription).not.toBe("");
  });

  it("pads single-digit days and months, and leaves dates that are not DD/MM/YYYY alone", () => {
    const { transactions } = parseBankCsvContent(`Date,Description,Amount
1/2/2026,A,-1
02/2026,B,-1
/02/2026,C,-1
01//2026,D,-1
01/02/,E,-1
2026-02-01,F,-1
01/02/2026/9,G,-1`);
    expect(transactions.map((t) => t.postedDate)).toEqual([
      "2026-02-01",
      "02/2026",
      "/02/2026",
      "01//2026",
      "01/02/",
      "2026-02-01",
      "01/02/2026/9",
    ]);
  });

  it("parses a three-column row and skips a shorter one", () => {
    const { transactions } = parseBankCsvContent(`Date,Description,Amount
09/02/2026,Co-op Food,-12.30
Total,-12.30`);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.amountGbp).toBe(-12.3);
  });

  it("reads a whole-pound amount with no decimal point", () => {
    const { transactions } = parseBankCsvContent(`Date,Description,Amount
09/02/2026,Salary,2600`);
    expect(transactions[0]?.amountGbp).toBe(2600);
  });

  it("rejects an amount that is not one number", () => {
    // "12-34" keeps its digits and minus sign after cleaning, but is not a number.
    expect(() =>
      parseBankCsvContent(`Date,Description,Amount
09/02/2026,Odd,12-34`),
    ).toThrow(CsvAmountError);
  });

  it("names its error class CsvAmountError", () => {
    expect(new CsvAmountError(1).name).toBe("CsvAmountError");
  });

  it("ignores blank and space-only lines before the header", () => {
    const { transactions } = parseBankCsvContent(`

   
Date,Description,Amount,Balance
09/02/2026,Co-op Food,-12.30,500.00`);
    expect(transactions).toHaveLength(1);
  });

  it.each(["", "\n   \n"])("rejects content with no lines (%j)", (content) => {
    expect(() => parseBankCsvContent(content)).toThrow("CSV content is empty.");
  });
});
