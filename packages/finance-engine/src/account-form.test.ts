// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_FORM_TYPES,
  ACCOUNT_SUBTYPE_LABEL,
  type AccountFormState,
  accountBalanceShown,
  accountBalanceStored,
  accountFieldSet,
  accountFieldsFromValues,
  accountFormFromSaved,
  accountFormNeedsPlan,
  accountFormToSend,
  accountFormValues,
  accountRequestFrom,
  changedFields,
  mortgageLinkChoices,
  newAccountForm,
  propertyPrefillFor,
  resolveSharePercent,
  STUDENT_LOAN_PLAN_OPTIONS,
} from "./account-form.js";

/** An add form of this type with these fields typed. */
const form = (fields: Partial<AccountFormState> = {}): AccountFormState => ({
  ...newAccountForm(),
  ...fields,
});

const getter =
  (values: Record<string, string>) =>
  (key: string): string | null =>
    values[key] ?? null;

describe("the types and options", () => {
  it("lists the eleven types in the type select's order", () => {
    expect(ACCOUNT_FORM_TYPES).toEqual([
      "Current",
      "Saving",
      "Investment",
      "Pension",
      "Property",
      "Credit Card",
      "Overdraft",
      "Mortgage",
      "Loan",
      "Student Loan",
      "Owed",
    ]);
  });

  it("names the student loan plans as stored", () => {
    expect(STUDENT_LOAN_PLAN_OPTIONS.map((o) => o.value)).toEqual([
      "PLAN_1",
      "PLAN_2",
      "PLAN_4",
      "PLAN_5",
      "POSTGRAD",
    ]);
  });

  it("labels every stored kind", () => {
    expect(ACCOUNT_SUBTYPE_LABEL.lifetime_isa).toBe("Lifetime ISA (LISA)");
    expect(ACCOUNT_SUBTYPE_LABEL.btl_mortgage).toBe("Buy-to-let (BTL) mortgage");
    expect(ACCOUNT_SUBTYPE_LABEL.rental).toBe("Rental property");
    expect(ACCOUNT_SUBTYPE_LABEL.car_finance).toBe("Car finance or HP");
    expect(ACCOUNT_SUBTYPE_LABEL.general_investment).toBe("General investment account");
    // 7 savings + 2 investment + 2 mortgage + 2 property + 3 loan = 16 kinds.
    expect(Object.keys(ACCOUNT_SUBTYPE_LABEL)).toHaveLength(16);
  });
});

describe("accountFieldSet", () => {
  it("an unknown type shows only the common fields", () => {
    expect(accountFieldSet({ type: "Nonsense", name: "X" })).toEqual({
      kind: null,
      interestRate: null,
      monthlyContribution: null,
      creditFields: false,
      mortgageFields: false,
      studentLoanPlan: false,
      joint: true,
    });
  });

  it("no type at all is the same, and can be joint", () => {
    expect(accountFieldSet({}).kind).toBeNull();
    expect(accountFieldSet({}).joint).toBe(true);
  });

  it("an ISA kind cannot be joint, an empty kind falls back to the name", () => {
    expect(accountFieldSet({ type: "Saving", name: "Pot", accountSubtype: "cash_isa" }).joint).toBe(
      false,
    );
    expect(accountFieldSet({ type: "Saving", name: "My ISA", accountSubtype: "" }).joint).toBe(
      false,
    );
    expect(accountFieldSet({ type: "Saving", name: "Pot", accountSubtype: "" }).joint).toBe(true);
  });
});

describe("changedFields", () => {
  it("keeps only values that differ, with figures compared as numbers", () => {
    expect(
      changedFields(
        { a: "1200", b: "x", c: "", d: "5", e: "abc" },
        { a: "1200.00", b: "y", c: "", d: "", e: "abd" },
      ),
    ).toEqual({ b: "y", d: "", e: "abd" });
  });

  it("an empty value against 0 is a change both ways", () => {
    expect(changedFields({ a: "" }, { a: "0" })).toEqual({ a: "0" });
    expect(changedFields({ a: "0" }, { a: "" })).toEqual({ a: "" });
  });

  it("Infinity is not a figure, so equal-looking text decides", () => {
    // Number("Infinity") is not finite, so "Infinity" and "1e999" differ as text.
    expect(changedFields({ a: "Infinity" }, { a: "1e999" })).toEqual({ a: "1e999" });
  });

  it("a key missing from what opened counts as empty", () => {
    expect(changedFields({} as Record<string, string>, { a: "1", b: "" })).toEqual({ a: "1" });
  });
});

describe("the sign rule", () => {
  it("shows a debt as the positive amount owed, anything else as stored", () => {
    expect(accountBalanceShown("Loan", -900)).toBe("900");
    expect(accountBalanceShown("Current", -50)).toBe("-50");
    expect(accountBalanceShown("Loan", undefined)).toBe("");
    expect(accountBalanceShown("Loan", null)).toBe("");
  });

  it("stores a debt as minus the amount owed, 0 as 0", () => {
    expect(accountBalanceStored("Credit Card", "500")).toBe("-500");
    // A minus typed is the same amount owed: |-500| = 500, stored -500.
    expect(accountBalanceStored("Credit Card", "-500")).toBe("-500");
    expect(accountBalanceStored("Mortgage", "0")).toBe("0");
    expect(accountBalanceStored("Mortgage", "")).toBe("");
    expect(accountBalanceStored("Saving", "500")).toBe("500");
    expect(accountBalanceStored("Saving", "-5")).toBe("-5");
  });
});

describe("resolveSharePercent", () => {
  it("rounds and bounds a joint share to 1 to 99, sole has none", () => {
    expect(resolveSharePercent("joint", 40.4)).toBe(40);
    expect(resolveSharePercent("joint", 40.5)).toBe(41);
    expect(resolveSharePercent("joint", 0)).toBe(1);
    expect(resolveSharePercent("joint", 1)).toBe(1);
    expect(resolveSharePercent("joint", 99)).toBe(99);
    expect(resolveSharePercent("joint", 100)).toBe(99);
    expect(resolveSharePercent("joint", null)).toBe(50);
    expect(resolveSharePercent("sole", 40)).toBeNull();
  });
});

describe("the form's state", () => {
  it("opens a saved account with each figure as text and the term split", () => {
    expect(
      accountFormFromSaved({
        name: "Mortgage",
        type: "Mortgage",
        accountSubtype: "btl_mortgage",
        balance: -200000,
        interestRate: 4.5,
        monthlyContribution: 1000,
        creditLimit: null,
        promoZeroPercentUntil: null,
        studentLoanPlan: null,
        // 295 months = 24 years (288) and 7 months.
        termMonths: 295,
        fixedRateEndDate: "2028-01-31",
        repaymentType: "repayment",
        linkedAccountId: "h1",
        ownership: "joint",
        sharePercent: 40,
      }),
    ).toEqual({
      name: "Mortgage",
      type: "Mortgage",
      accountSubtype: "btl_mortgage",
      balance: "200000",
      interestRate: "4.5",
      monthlyContribution: "1000",
      studentLoanPlan: "",
      creditLimit: "",
      promoZeroPercentUntil: "",
      termYears: "24",
      termExtraMonths: "7",
      fixedRateEndDate: "2028-01-31",
      repaymentType: "repayment",
      linkedAccountId: "h1",
      ownership: "joint",
      sharePercent: 40,
    });
  });

  it("an empty saved account opens as an empty Current, sole, at the default share", () => {
    expect(accountFormFromSaved({})).toEqual(newAccountForm());
    expect(newAccountForm()).toMatchObject({
      type: "Current",
      ownership: "sole",
      sharePercent: 50,
    });
  });

  it("fills what a saved account has and the add form lacks", () => {
    const state = accountFormFromSaved({
      type: "Credit Card",
      creditLimit: 3000,
      promoZeroPercentUntil: "2027-06-30",
      studentLoanPlan: "PLAN_2",
      // 299.6 months rounds to 300 = 25 years and 0 months.
      termMonths: 299.6,
      ownership: "something else",
    });
    expect(state).toMatchObject({
      creditLimit: "3000",
      promoZeroPercentUntil: "2027-06-30",
      studentLoanPlan: "PLAN_2",
      termYears: "25",
      termExtraMonths: "0",
      ownership: "sole",
    });
  });

  it("a figure that is not a number opens empty", () => {
    const state = accountFormFromSaved({
      interestRate: Number.NaN,
      termMonths: Number.POSITIVE_INFINITY,
    });
    expect(state.interestRate).toBe("");
    expect([state.termYears, state.termExtraMonths]).toEqual(["", ""]);
  });

  it("the add form takes its prefill", () => {
    expect(
      newAccountForm({
        initialName: "Home (your estimate)",
        initialType: "Property",
        initialSubtype: "home",
        initialOwnership: "joint",
        initialSharePercent: 40,
      }),
    ).toMatchObject({
      name: "Home (your estimate)",
      type: "Property",
      accountSubtype: "home",
      ownership: "joint",
      sharePercent: 40,
    });
  });
});

describe("accountFormValues", () => {
  const everything = form({
    name: "X",
    accountSubtype: "k",
    balance: "10",
    interestRate: "3",
    monthlyContribution: "20",
    studentLoanPlan: "PLAN_1",
    creditLimit: "1000",
    promoZeroPercentUntil: "2027-01-01",
    termYears: "2",
    termExtraMonths: "3",
    fixedRateEndDate: "2028-01-01",
    repaymentType: "repayment",
    linkedAccountId: "h1",
    ownership: "joint",
    sharePercent: 40,
  });

  it("a current account empties every field it does not show", () => {
    expect(accountFormValues({ ...everything, type: "Current" })).toEqual({
      name: "X",
      type: "Current",
      accountSubtype: "",
      balance: "10",
      interestRate: "",
      monthlyContribution: "",
      studentLoanPlan: "",
      creditLimit: "",
      promoZeroPercentUntil: "",
      termMonths: "",
      fixedRateEndDate: "",
      repaymentType: "",
      linkedAccountId: "",
      ownership: "joint",
      sharePercent: "40",
    });
  });

  it("a mortgage keeps its own fields, the term as whole months", () => {
    const values = accountFormValues({ ...everything, type: "Mortgage" });
    // 2 years and 3 months = 2 * 12 + 3 = 27 months.
    expect(values).toMatchObject({
      accountSubtype: "k",
      interestRate: "3",
      monthlyContribution: "20",
      termMonths: "27",
      fixedRateEndDate: "2028-01-01",
      repaymentType: "repayment",
      linkedAccountId: "h1",
      creditLimit: "",
      studentLoanPlan: "",
    });
  });

  it("a card keeps its credit fields, a student loan its plan", () => {
    expect(accountFormValues({ ...everything, type: "Credit Card" })).toMatchObject({
      creditLimit: "1000",
      promoZeroPercentUntil: "2027-01-01",
      accountSubtype: "",
    });
    expect(accountFormValues({ ...everything, type: "Student Loan" }).studentLoanPlan).toBe(
      "PLAN_1",
    );
  });

  it("a pension cannot be joint, so it is sole with no share", () => {
    expect(accountFormValues({ ...everything, type: "Pension" })).toMatchObject({
      ownership: "sole",
      sharePercent: "",
    });
  });

  it("the term from years alone, months alone, or nothing", () => {
    const term = (termYears: string, termExtraMonths: string) =>
      accountFormValues(form({ type: "Mortgage", termYears, termExtraMonths })).termMonths;
    expect(term("25", "")).toBe("300");
    expect(term("", "6")).toBe("6");
    expect(term("", "")).toBe("");
    // 0 years and 0 months is no term.
    expect(term("0", "0")).toBe("");
    // 0 years and 1 month is 1 month, the smallest term.
    expect(term("0", "1")).toBe("1");
    expect(term("x", "1")).toBe("");
    // 1.5 years = 18 months; 0.4 months more = 18.4, rounded to 18.
    expect(term("1.5", "0.4")).toBe("18");
  });
});

describe("accountFormNeedsPlan", () => {
  it("only a student loan with no plan needs one", () => {
    expect(accountFormNeedsPlan(form({ type: "Student Loan" }))).toBe(true);
    expect(accountFormNeedsPlan(form({ type: "Student Loan", studentLoanPlan: "PLAN_5" }))).toBe(
      false,
    );
    expect(accountFormNeedsPlan(form({ type: "Loan" }))).toBe(false);
  });
});

describe("mortgageLinkChoices", () => {
  const home = { id: "h1", name: "Our house", type: "Property", accountSubtype: "home" };
  const rental = { id: "r1", name: "Flat", type: "Property", accountSubtype: "rental" };
  const plot = { id: "p1", type: "Property", accountSubtype: null };
  const noId = { name: "Draft", type: "Property", accountSubtype: "home" };
  const loan = { id: "l1", name: "Loan", type: "Loan" };
  const mortgage = form({ type: "Mortgage", name: "Mortgage" });

  it("adding: lists the home kind and the unkinded, preselects nothing with two", () => {
    expect(
      mortgageLinkChoices({
        state: mortgage,
        accounts: [home, rental, plot, noId, loan],
        editing: false,
        linkTouched: false,
      }),
    ).toEqual({
      linkable: [
        { id: "h1", name: "Our house" },
        { id: "p1", name: "" },
      ],
      showLinkSelect: true,
      showHomeValue: false,
      linkedAccountId: "",
      propertyIsRental: false,
    });
  });

  it("adding: one property is preselected until the person chooses", () => {
    const input = { state: mortgage, accounts: [home, rental], editing: false };
    expect(mortgageLinkChoices({ ...input, linkTouched: false }).linkedAccountId).toBe("h1");
    expect(mortgageLinkChoices({ ...input, linkTouched: true }).linkedAccountId).toBe("");
  });

  it("adding a buy-to-let mortgage looks for a rental; none asks the property's value", () => {
    const btl = { ...mortgage, accountSubtype: "btl_mortgage" };
    expect(
      mortgageLinkChoices({
        state: btl,
        accounts: [home, rental],
        editing: false,
        linkTouched: false,
      }),
    ).toMatchObject({
      linkable: [{ id: "r1", name: "Flat" }],
      linkedAccountId: "r1",
      propertyIsRental: true,
    });
    expect(
      mortgageLinkChoices({ state: btl, accounts: [home], editing: false, linkTouched: false }),
    ).toEqual({
      linkable: [],
      showLinkSelect: false,
      showHomeValue: true,
      linkedAccountId: "",
      propertyIsRental: true,
    });
  });

  it("editing: keeps the saved link listed even of the other kind, never preselects or asks", () => {
    const btl = { ...mortgage, accountSubtype: "btl_mortgage", linkedAccountId: "" };
    const choices = mortgageLinkChoices({
      state: btl,
      accounts: [home],
      savedLinkedAccountId: "h1",
      editing: true,
      linkTouched: false,
    });
    expect(choices).toMatchObject({
      linkable: [{ id: "h1", name: "Our house" }],
      showLinkSelect: true,
      showHomeValue: false,
      // The typed value wins in an edit, here cleared.
      linkedAccountId: "",
    });
    expect(
      mortgageLinkChoices({ state: mortgage, accounts: [], editing: true, linkTouched: false })
        .showHomeValue,
    ).toBe(false);
  });

  it("anything but a mortgage lists nothing and asks nothing", () => {
    expect(
      mortgageLinkChoices({
        state: form({ type: "Loan", linkedAccountId: "h1" }),
        accounts: [home],
        editing: false,
        linkTouched: false,
      }),
    ).toEqual({
      linkable: [],
      showLinkSelect: false,
      showHomeValue: false,
      linkedAccountId: "",
      propertyIsRental: false,
    });
  });

  it("the typed link stands once chosen", () => {
    expect(
      mortgageLinkChoices({
        state: { ...mortgage, linkedAccountId: "h1" },
        accounts: [home, plot],
        editing: false,
        linkTouched: true,
      }).linkedAccountId,
    ).toBe("h1");
  });
});

describe("accountFormToSend", () => {
  it("an add of a card sends its credit fields empty, nothing else empty, the debt negative", () => {
    expect(
      accountFormToSend({
        editing: false,
        opened: form(),
        current: form({ type: "Credit Card", name: "Card", balance: "250", interestRate: "20" }),
        linkedAccountId: "",
      }),
    ).toEqual({
      name: "Card",
      type: "Credit Card",
      ownership: "sole",
      creditLimit: "",
      promoZeroPercentUntil: "",
      // 250 owed is stored as -250.
      balance: "-250",
      interestRate: "20",
    });
  });

  it("an add of a student loan sends its plan even empty; a saving its kind", () => {
    expect(
      accountFormToSend({
        editing: false,
        opened: form(),
        current: form({ type: "Student Loan", name: "SL" }),
        linkedAccountId: "",
      }),
    ).toEqual({ name: "SL", type: "Student Loan", ownership: "sole", studentLoanPlan: "" });
    expect(
      accountFormToSend({
        editing: false,
        opened: form(),
        current: form({ type: "Saving", name: "S" }),
        linkedAccountId: "",
      }),
    ).toEqual({ name: "S", type: "Saving", ownership: "sole", accountSubtype: "" });
  });

  it("an add sends the link given, not the typed one", () => {
    expect(
      accountFormToSend({
        editing: false,
        opened: form(),
        current: form({ type: "Mortgage", name: "M", linkedAccountId: "" }),
        linkedAccountId: "h1",
      }),
    ).toEqual({
      name: "M",
      type: "Mortgage",
      ownership: "sole",
      accountSubtype: "",
      linkedAccountId: "h1",
    });
  });

  it("a joint add sends its share", () => {
    expect(
      accountFormToSend({
        editing: false,
        opened: form(),
        current: form({ name: "J", ownership: "joint", sharePercent: 30 }),
        linkedAccountId: "",
      }),
    ).toEqual({ name: "J", type: "Current", ownership: "joint", sharePercent: "30" });
  });

  it("an edit sends what changed, the share with the ownership", () => {
    const opened = form({ name: "A", balance: "1200", ownership: "sole" });
    expect(
      accountFormToSend({
        editing: true,
        opened,
        current: { ...opened, balance: "1200.00" },
        linkedAccountId: "",
      }),
    ).toEqual({});
    expect(
      accountFormToSend({
        editing: true,
        opened,
        current: { ...opened, ownership: "joint", sharePercent: 50 },
        linkedAccountId: "",
      }),
    ).toEqual({ ownership: "joint", sharePercent: "50" });
  });

  it("an edit from joint to sole sends no share", () => {
    const opened = form({ name: "A", ownership: "joint", sharePercent: 40 });
    expect(
      accountFormToSend({
        editing: true,
        opened,
        current: { ...opened, ownership: "sole" },
        linkedAccountId: "",
      }),
    ).toEqual({ ownership: "sole" });
  });

  it("an edit's cleared balance is not sent, a new debt balance is sent negative", () => {
    const opened = form({ type: "Loan", name: "L", balance: "900" });
    expect(
      accountFormToSend({
        editing: true,
        opened,
        current: { ...opened, balance: "" },
        linkedAccountId: "",
      }),
    ).toEqual({});
    expect(
      accountFormToSend({
        editing: true,
        opened,
        current: { ...opened, balance: "0" },
        linkedAccountId: "",
      }),
    ).toEqual({ balance: "0" });
  });
});

describe("accountFieldsFromValues", () => {
  it("reads every field, empty ones as cleared", () => {
    expect(
      accountFieldsFromValues(
        getter({
          ownership: "joint",
          sharePercent: "40.4",
          accountSubtype: "",
          studentLoanPlan: "PLAN_2",
          balance: "-250.556",
          creditLimit: "",
          promoZeroPercentUntil: "2027-06-30",
          interestRate: "4.125",
          monthlyContribution: "",
          termMonths: "300",
          fixedRateEndDate: "",
          repaymentType: "interest-only",
          linkedAccountId: "h1",
        }),
      ),
    ).toEqual({
      ownership: "joint",
      // 40.4 rounds to 40.
      sharePercent: 40,
      accountSubtype: null,
      studentLoanPlan: "PLAN_2",
      // -250.556 to 2 dp: -25055.6 rounds to -25056, over 100 is -250.56.
      balance: -250.56,
      creditLimit: null,
      promoZeroPercentUntil: "2027-06-30",
      // 4.125 + epsilon, times 100 = 412.5 and a hair, rounds to 413: 4.13.
      interestRate: 4.13,
      monthlyContribution: null,
      termMonths: 300,
      fixedRateEndDate: null,
      repaymentType: "interest-only",
      linkedAccountId: "h1",
    });
  });

  it("leaves out what was not posted, and an empty balance", () => {
    expect(accountFieldsFromValues(getter({}))).toEqual({});
    expect(accountFieldsFromValues(getter({ balance: "", studentLoanPlan: "" }))).toEqual({});
  });

  it("sole clears the share; an unknown ownership sends neither", () => {
    expect(accountFieldsFromValues(getter({ ownership: "sole", sharePercent: "40" }))).toEqual({
      ownership: "sole",
      sharePercent: null,
    });
    expect(accountFieldsFromValues(getter({ ownership: "both", sharePercent: "40" }))).toEqual({
      sharePercent: 40,
    });
  });

  it("bounds the share to 1 to 100 and drops one that is not a number", () => {
    expect(accountFieldsFromValues(getter({ sharePercent: "0" }))).toEqual({ sharePercent: 1 });
    expect(accountFieldsFromValues(getter({ sharePercent: "1" }))).toEqual({ sharePercent: 1 });
    expect(accountFieldsFromValues(getter({ sharePercent: "100" }))).toEqual({ sharePercent: 100 });
    expect(accountFieldsFromValues(getter({ sharePercent: "150" }))).toEqual({ sharePercent: 100 });
    expect(accountFieldsFromValues(getter({ sharePercent: "x" }))).toEqual({});
    expect(accountFieldsFromValues(getter({ sharePercent: "" }))).toEqual({});
  });

  it("drops a figure that is not a number", () => {
    expect(accountFieldsFromValues(getter({ balance: "x", creditLimit: "y" }))).toEqual({});
  });

  it("takes a term of 1 to 600 whole months, rounded", () => {
    const term = (termMonths: string) => accountFieldsFromValues(getter({ termMonths })).termMonths;
    expect(term("1")).toBe(1);
    expect(term("600")).toBe(600);
    // 0.4 rounds to 0, below 1; 600.4 rounds to 600; 600.5 rounds to 601, above 600.
    expect(term("0.4")).toBeUndefined();
    expect(term("600.4")).toBe(600);
    expect(term("600.5")).toBeUndefined();
    expect(term("0")).toBeUndefined();
    expect(term("x")).toBeUndefined();
    expect(term("")).toBeNull();
  });

  it("takes only the two repayment types", () => {
    const repay = (repaymentType: string) =>
      accountFieldsFromValues(getter({ repaymentType })).repaymentType;
    expect(repay("repayment")).toBe("repayment");
    expect(repay("interest-only")).toBe("interest-only");
    expect(repay("part")).toBeUndefined();
    expect(repay("")).toBeNull();
  });
});

describe("accountRequestFrom", () => {
  it("an add posts the name, type and fields", () => {
    expect(
      accountRequestFrom({
        editing: false,
        get: getter({ name: "Pot", type: "Saving", balance: "10" }),
        homeValue: null,
      }),
    ).toEqual({ kind: "create", body: { name: "Pot", type: "Saving", balance: 10 } });
  });

  it("an add with no name or type posts them as null", () => {
    expect(accountRequestFrom({ editing: false, get: getter({}), homeValue: null })).toEqual({
      kind: "create",
      body: { name: null, type: null },
    });
  });

  it("a mortgage with a home value and no link adds both, the mortgage without its type", () => {
    expect(
      accountRequestFrom({
        editing: false,
        get: getter({ name: "M", type: "Mortgage", balance: "-1000", linkedAccountId: "" }),
        // 250000.126 to 2 dp is 250000.13.
        homeValue: 250000.126,
      }),
    ).toEqual({
      kind: "createWithProperty",
      body: { mortgage: { name: "M", balance: -1000 }, property: { balance: 250000.13 } },
    });
  });

  it("a home value of 0, below, not a number or none, or a link, adds the mortgage alone", () => {
    for (const homeValue of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, null]) {
      expect(
        accountRequestFrom({
          editing: false,
          get: getter({ name: "M", type: "Mortgage" }),
          homeValue,
        }).kind,
      ).toBe("create");
    }
    expect(
      accountRequestFrom({
        editing: false,
        get: getter({ name: "M", type: "Mortgage", linkedAccountId: "h1" }),
        homeValue: 100,
      }),
    ).toEqual({ kind: "create", body: { name: "M", type: "Mortgage", linkedAccountId: "h1" } });
    // The smallest value above 0 still adds both: 0.01.
    expect(
      accountRequestFrom({
        editing: false,
        get: getter({ name: "M", type: "Mortgage" }),
        homeValue: 0.01,
      }).kind,
    ).toBe("createWithProperty");
  });

  it("a home value on a loan is ignored", () => {
    expect(
      accountRequestFrom({
        editing: false,
        get: getter({ name: "L", type: "Loan" }),
        homeValue: 100,
      }).kind,
    ).toBe("create");
  });

  it("an edit sends the name and type only when posted, and nothing is none", () => {
    expect(
      accountRequestFrom({ editing: true, get: getter({ interestRate: "4.2" }), homeValue: null }),
    ).toEqual({ kind: "update", body: { interestRate: 4.2 } });
    expect(
      accountRequestFrom({ editing: true, get: getter({ name: "", type: "Loan" }), homeValue: 5 }),
    ).toEqual({ kind: "update", body: { name: "", type: "Loan" } });
    expect(accountRequestFrom({ editing: true, get: getter({}), homeValue: null })).toEqual({
      kind: "none",
    });
  });
});

describe("propertyPrefillFor", () => {
  it("with no mortgage, a home held solely", () => {
    expect(propertyPrefillFor([])).toEqual({
      name: "Home (your estimate)",
      subtype: "home",
      ownership: "sole",
      sharePercent: null,
    });
  });

  it("the one unlinked joint residential mortgage gives a joint home at its share", () => {
    expect(
      propertyPrefillFor([
        { id: "m1", type: "Mortgage", name: "Mortgage", ownership: "joint", sharePercent: 40 },
        { id: "m2", type: "Mortgage", name: "Old", linkedAccountId: "h1" },
      ]),
    ).toEqual({
      name: "Home (your estimate)",
      subtype: "home",
      ownership: "joint",
      sharePercent: 40,
      linkMortgage: { id: "m1" },
    });
  });

  it("only a buy-to-let one gives a rental, with its version", () => {
    expect(
      propertyPrefillFor([
        { id: "b1", type: "Mortgage", accountSubtype: "btl_mortgage", updatedAt: "v1" },
      ]),
    ).toEqual({
      name: "Buy-to-let property",
      subtype: "rental",
      ownership: "sole",
      sharePercent: null,
      linkMortgage: { id: "b1", updatedAt: "v1" },
    });
  });

  it("two that could be it, or one with no id, give a home linked to nothing", () => {
    const sole = propertyPrefillFor([
      { id: "m1", type: "Mortgage" },
      { id: "m2", type: "Mortgage" },
    ]);
    expect(sole.linkMortgage).toBeUndefined();
    expect(propertyPrefillFor([{ type: "Mortgage" }]).linkMortgage).toBeUndefined();
    // A joint mortgage with no share saved suggests no share.
    expect(
      propertyPrefillFor([{ id: "m1", type: "Mortgage", ownership: "joint" }]).sharePercent,
    ).toBeNull();
  });
});

describe("the field set of every type (each label as web shows it)", () => {
  const debtRate = { label: "Interest rate (APR) (optional)" };
  const debtMonthly = { label: "Minimum payment each month (optional)" };
  const none = {
    kind: null,
    interestRate: null,
    monthlyContribution: null,
    creditFields: false,
    mortgageFields: false,
    studentLoanPlan: false,
  };
  const kindOf = (label: string) => expect.objectContaining({ label });
  const cases: [string, Record<string, unknown>][] = [
    ["Current", none],
    [
      "Saving",
      {
        ...none,
        kind: kindOf("Kind of account (optional)"),
        interestRate: { label: "Interest rate (AER)" },
        monthlyContribution: { label: "Saved each month" },
      },
    ],
    [
      "Investment",
      {
        ...none,
        kind: kindOf("Kind of account (optional)"),
        interestRate: { label: "Estimated annual return (%)" },
        monthlyContribution: { label: "Saved each month" },
      },
    ],
    [
      "Pension",
      {
        ...none,
        interestRate: { label: "Assumed growth a year (optional)" },
        monthlyContribution: { label: "Extra paid in each month (optional)" },
      },
    ],
    ["Property", { ...none, kind: kindOf("Home or rental") }],
    [
      "Credit Card",
      { ...none, interestRate: debtRate, monthlyContribution: debtMonthly, creditFields: true },
    ],
    [
      "Overdraft",
      { ...none, interestRate: debtRate, monthlyContribution: debtMonthly, creditFields: true },
    ],
    [
      "Loan",
      {
        ...none,
        kind: kindOf("Kind of loan (optional)"),
        interestRate: debtRate,
        monthlyContribution: debtMonthly,
      },
    ],
    [
      "Mortgage",
      {
        ...none,
        kind: kindOf("Kind of mortgage (optional)"),
        interestRate: { label: "Interest rate (optional)" },
        monthlyContribution: { label: "Monthly payment (optional)" },
        mortgageFields: true,
      },
    ],
    ["Student Loan", { ...none, studentLoanPlan: true }],
    ["Owed", none],
  ];

  it.each(cases)("%s", (type, expected) => {
    const { joint: _joint, ...set } = accountFieldSet({ type, name: "X" });
    expect(set).toEqual(expected);
  });

  it("each kind select lists its own options", () => {
    const values = (type: string) =>
      accountFieldSet({ type }).kind?.options.map((o) => o.value) ?? [];
    expect(values("Saving")).toHaveLength(7);
    expect(values("Investment")).toEqual(["stocks_and_shares_isa", "general_investment"]);
    expect(values("Property")).toEqual(["home", "rental"]);
    expect(values("Loan")).toEqual(["car_finance", "buy_now_pay_later", "other_loan"]);
    expect(values("Mortgage")).toEqual(["residential_mortgage", "btl_mortgage"]);
  });
});

describe("the edges the move keeps", () => {
  it("a saved null figure or term opens empty, not as 0", () => {
    const state = accountFormFromSaved({ interestRate: null, termMonths: null });
    expect(state.interestRate).toBe("");
    expect([state.termYears, state.termExtraMonths]).toEqual(["", ""]);
  });

  it("an add sends an empty name and type as they are", () => {
    expect(
      accountFormToSend({
        editing: false,
        opened: form(),
        current: form({ name: "", type: "" }),
        linkedAccountId: "",
      }),
    ).toEqual({ name: "", type: "", ownership: "sole" });
  });

  it("a joint account's rename sends no share", () => {
    const opened = form({ name: "A", ownership: "joint", sharePercent: 40 });
    expect(
      accountFormToSend({
        editing: true,
        opened,
        current: { ...opened, name: "B" },
        linkedAccountId: "",
      }),
    ).toEqual({ name: "B" });
  });

  it("rounds a half-penny up despite binary fractions", () => {
    // 1.005 is held as 1.00499999999999989..., so times 100 is just under 100.5; adding
    // Number.EPSILON first lifts it over, and it rounds to 101: 1.01.
    expect(accountFieldsFromValues(getter({ balance: "1.005" }))).toEqual({ balance: 1.01 });
  });

  it("the prefill ignores other types and mortgages with no id when counting", () => {
    // One mortgage with an id, plus a loan and a mortgage with no id: still the one.
    expect(
      propertyPrefillFor([
        { id: "m1", type: "Mortgage" },
        { id: "l1", type: "Loan" },
        { type: "Mortgage" },
      ]).linkMortgage,
    ).toEqual({ id: "m1" });
  });

  it("the prefill prefers the one residential mortgage over a buy-to-let one", () => {
    expect(
      propertyPrefillFor([
        { id: "b1", type: "Mortgage", accountSubtype: "btl_mortgage" },
        { id: "m1", type: "Mortgage", accountSubtype: "residential_mortgage" },
      ]),
    ).toMatchObject({ subtype: "home", linkMortgage: { id: "m1" } });
  });
});
