import { describe, expect, it } from "vitest";
import { categorizeAccountType } from "./account-category.js";
import {
  ANONYMOUS_ACCOUNT_TYPE,
  anonymiseDescription,
  anonymousAccountType,
  anonymousBudgetEntryLabels,
  builtInBudgetCategoryLabel,
  createBudgetCategoryAnonymiser,
  createNeutralLabeller,
  createTaxCategoryAnonymiser,
  createTaxRecordAnonymiser,
  genericAccountLabel,
  INSTITUTION_SCRUB_LIST,
  redactAccountNumbers,
  scrubInstitutionNames,
} from "./anonymise.js";

describe("scrubInstitutionNames (E17-N4)", () => {
  it("replaces every listed institution, case-insensitively", () => {
    for (const name of INSTITUTION_SCRUB_LIST) {
      expect(scrubInstitutionNames(`Paid ${name.toUpperCase()} card`)).toBe("Paid Bank card");
      expect(scrubInstitutionNames(`Paid ${name} card`)).toBe("Paid Bank card");
    }
  });

  it("covers the union of the previous tool and engine lists", () => {
    for (const n of [
      "monzo",
      "starling",
      "barclays",
      "hsbc",
      "santander",
      "natwest",
      "lloyds",
      "halifax",
      "amex",
    ]) {
      expect(INSTITUTION_SCRUB_LIST).toContain(n);
    }
  });

  it("leaves unrelated text alone", () => {
    expect(scrubInstitutionNames("Tesco groceries")).toBe("Tesco groceries");
  });

  it("catches spacing, hyphen, zero-width, full-width and homoglyph bypasses", () => {
    expect(scrubInstitutionNames("NAT WEST")).toBe("Bank");
    expect(scrubInstitutionNames("Mon-zo coffee")).toBe("Bank coffee");
    expect(scrubInstitutionNames("Mon\u200Bzo coffee")).toBe("Bank coffee");
    expect(scrubInstitutionNames("\uFF2D\uFF4F\uFF4E\uFF5A\uFF4F coffee")).toBe("Bank coffee");
    // Cyrillic o and Latin rest
    expect(scrubInstitutionNames("M\u043Enzo coffee")).toBe("Bank coffee");
    expect(scrubInstitutionNames("Sainsbury's Bank")).toBe("Bank");
    expect(scrubInstitutionNames("Royal Bank of Scotland")).toBe("Bank");
    expect(scrubInstitutionNames("Co-op")).toBe("Bank");
  });

  it("uses word boundaries so ordinary words survive", () => {
    expect(scrubInstitutionNames("Atomic Kitten tickets")).toBe("Atomic Kitten tickets");
    expect(scrubInstitutionNames("Tidewater")).toBe("Tidewater");
  });

  it("is linear on adversarial input", () => {
    const hostile = `${"m- ".repeat(20000)}x`;
    const start = performance.now();
    scrubInstitutionNames(hostile);
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it("redacts sort codes and long digit runs", () => {
    expect(redactAccountNumbers("Sort 12-34-56 acc 12345678")).toBe(
      "Sort [redacted] acc [redacted]",
    );
    expect(redactAccountNumbers("Ref 12345")).toBe("Ref 12345");
    expect(anonymiseDescription("Monzo 12-34-56 12345678")).toBe("Bank [redacted] [redacted]");
  });
});

describe("anonymousBudgetEntryLabels (M-PRIV4, ruling 7)", () => {
  it("labels entries by fixed group plus a number and never uses the entry name", () => {
    const labels = anonymousBudgetEntryLabels([
      { name: "Rent to J Smith", category: "Housing", isIncome: false },
      { name: "Acme Ltd", category: "Salary", isIncome: true },
      { name: "Garage", category: "housing", isIncome: false },
      { name: "Food", category: "Food", isIncome: false },
      { name: "Bonus", category: "Bonus", isIncome: true },
    ]);
    expect(labels).toEqual(["Housing 1", "Income 1", "Housing 2", "Entry 1", "Income 2"]);
  });

  it("gives the same name in the same group the same label, and a typed category no group", () => {
    expect(
      anonymousBudgetEntryLabels([
        { name: "Netflix", category: "bills", isIncome: false },
        { name: " netflix ", category: "BILLS", isIncome: false },
        { name: "Netflix", category: "Monzo 12345678", isIncome: false },
        { name: "Bills 1", category: "housing", isIncome: false },
      ]),
    ).toEqual(["Bills 1", "Bills 1", "Entry 1", "Housing 1"]);
  });

  it("gives its own labels back when applied to them", () => {
    const entries = [
      { name: "Rent", category: "housing", isIncome: false },
      { name: "Gym", category: "Jane's fund", isIncome: false },
      { name: "Rent", category: "housing", isIncome: false },
    ];
    const once = anonymousBudgetEntryLabels(entries);
    const categoryLabel = createBudgetCategoryAnonymiser();
    const categories = entries.map((e) => categoryLabel(e.category));
    const twice = anonymousBudgetEntryLabels(
      entries.map((e, i) => ({ ...e, name: once[i], category: categories[i] as string })),
    );
    expect(twice).toEqual(once);
  });
});

describe("neutral category and tax labels (ruling 7)", () => {
  it("keeps built-in budget categories and numbers typed ones", () => {
    const label = createBudgetCategoryAnonymiser();
    expect(
      ["savings", "Barclays Joint 4471", "Debt", "Mum's loan", "barclays joint 4471"].map(label),
    ).toEqual(["savings", "Custom category 1", "Debt", "Custom category 2", "Custom category 1"]);
  });

  it("never emits a loosely matched built-in category as stored, and keeps exact keys", () => {
    const label = createBudgetCategoryAnonymiser();
    // Zero-width, case, outer space, Cyrillic look-alike and apostrophe variants of a key.
    const loose = ["B​ills", "BILLS", "  bills  ", "вills", "bil'ls", "Savings"];
    const out = loose.map(label);
    expect(out).toEqual(["Bills", "Bills", "Bills", "Bills", "Bills", "Savings"]);
    for (const stored of loose.slice(0, 5)) expect(out).not.toContain(stored);
    // Stored exactly as a key, the key stays (the engine matches "savings" and "debt" exactly).
    expect(["savings", "debt", "bills"].map(label)).toEqual(["savings", "debt", "bills"]);
    // A display label never equals a key, so a loose "Savings" is not read as the savings key.
    expect(label("Savings")).not.toBe("savings");
  });

  it("maps a stored account type onto the fixed list, so a legacy free-text type never leaves", () => {
    expect(anonymousAccountType("Jane's ISA 4471")).toBe(ANONYMOUS_ACCOUNT_TYPE);
    expect(anonymousAccountType("Sav​ing")).toBe("Other");
    expect(anonymousAccountType("Current")).toBe("Current");
    expect(anonymousAccountType(" credit card ")).toBe("Credit Card");
    expect(anonymousAccountType("isa")).toBe("ISA");
    expect(anonymousAccountType("student_loan")).toBe("student_loan");
    expect(anonymousAccountType(undefined)).toBeUndefined();
    expect(anonymousAccountType("")).toBe("");
    expect(genericAccountLabel("Jane's ISA 4471", 1)).toBe("Other Account #1");
    expect(genericAccountLabel("Credit Card", 2)).toBe("Credit Card Account #2");
    expect(genericAccountLabel(null, 1)).toBe("other Account #1");
  });

  it("keeps each account's engine category when it maps the type", () => {
    for (const stored of [
      "Current",
      "checking",
      " Saving ",
      "savings",
      "ISA",
      "gia",
      "SIPP",
      "Credit Card",
      "credit_card",
      "LOAN",
      "Overdraft",
      "Owed",
      "Property",
      "student loan",
      "Mortgages",
      "Jane's ISA 4471",
      "credit  card",
      "   ",
    ]) {
      expect(categorizeAccountType(anonymousAccountType(stored)), stored).toBe(
        categorizeAccountType(stored),
      );
    }
  });

  it("knows the built-in budget categories", () => {
    expect(builtInBudgetCategoryLabel("bills")).toBe("Bills");
    expect(builtInBudgetCategoryLabel(" LIVING ")).toBe("Living");
    expect(builtInBudgetCategoryLabel("toString")).toBeUndefined();
    expect(builtInBudgetCategoryLabel("Marc Gallagher ISA")).toBeUndefined();
  });

  it("labels tax records by source and keeps fixed category ids", () => {
    const name = createTaxRecordAnonymiser();
    expect(
      [
        { name: "Flat 2", source: "rental" },
        { name: "Barclays Joint 4471", source: "rental" },
        { name: "Flat 2", source: "rental" },
        { name: "Consulting", source: "self-employed" },
        { name: "Odd", source: "lottery" },
      ].map(name),
    ).toEqual(["Rental 1", "Rental 2", "Rental 1", "Self-employed 1", "Tax record 1"]);
    const category = createTaxCategoryAnonymiser();
    expect(["rental_income", "Mum's loan", "paye_salary", "Mum's loan"].map(category)).toEqual([
      "rental_income",
      "Custom category 1",
      "paye_salary",
      "Custom category 1",
    ]);
  });

  it("numbers each group on its own", () => {
    const label = createNeutralLabeller();
    expect([label("Bills", "a"), label("Housing", "a"), label("Bills", "b")]).toEqual([
      "Bills 1",
      "Housing 1",
      "Bills 2",
    ]);
  });
});
