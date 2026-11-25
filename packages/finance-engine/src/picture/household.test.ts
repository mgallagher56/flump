import { describe, expect, it } from "vitest";
import type { RawAccount } from "../portfolio.js";
import { selectUkWhatIfVectors } from "../test-vectors/uk-whatif.vectors.js";
import type { UkTaxYear } from "../types.js";
import { dan } from "./__fixtures__/personas/dan.js";
import { debtStressed } from "./__fixtures__/personas/debt-stressed.js";
import { homeowner } from "./__fixtures__/personas/homeowner.js";
import { sam } from "./__fixtures__/personas/sam.js";
import { scottish } from "./__fixtures__/personas/scottish.js";
import {
  buildHouseholdPicture,
  combineHouseholdAccounts,
  type HouseholdPictureInput,
  type JointAccountLink,
  selectHouseholdTakeHome,
} from "./household.js";
import type { ProfileFacts } from "./input.js";
import { selectTakeHome } from "./selectors/take-home.js";

/**
 * E34 C2: two person pictures combined into one household picture. Every expected value is worked
 * out by hand from the persona fixtures' balances (see the comments), never from the function.
 */

const joint = (account: RawAccount, sharePercent: number): RawAccount => ({
  ...account,
  ownership: "joint",
  sharePercent,
});

// Renting household: Sam and Dan, who both rent, with a joint bills account each saved at 50%.
const samBills: RawAccount = joint(
  { id: "sam-bills", name: "Bills account", type: "Current", balance: 1200 },
  50,
);
const danBills: RawAccount = joint(
  { id: "dan-bills", name: "Bills account", type: "Current", balance: 1200 },
  50,
);
const renting = (links: JointAccountLink[] = [{ a: "sam-bills", b: "dan-bills" }]) =>
  ({
    a: { profile: sam.profile, accounts: [...sam.accounts, samBills] },
    b: { profile: dan.profile, accounts: [...dan.accounts, danBills] },
    jointAccounts: links,
  }) satisfies HouseholdPictureInput;

// Home-owning household: the homeowner persona and the debt-stressed persona share the home and
// its mortgage. Each saves both as joint; the shares are set per test.
const homeownerHome = homeowner.accounts.find((a) => a.id === "homeowner-home") as RawAccount;
const homeownerMortgage = homeowner.accounts.find(
  (a) => a.id === "homeowner-mortgage",
) as RawAccount;
const homeownerOthers = homeowner.accounts.filter(
  (a) => a.id !== "homeowner-home" && a.id !== "homeowner-mortgage",
);
const partnerHome = { ...homeownerHome, id: "partner-home" };
const partnerMortgage = {
  ...homeownerMortgage,
  id: "partner-mortgage",
  linkedAccountId: "partner-home",
};
const HOME_LINKS: JointAccountLink[] = [
  { a: "homeowner-home", b: "partner-home" },
  { a: "homeowner-mortgage", b: "partner-mortgage" },
];
function owning(
  shareA: number,
  shareB: number,
  partnerOverrides: { home?: Partial<RawAccount> } = {},
): HouseholdPictureInput {
  return {
    a: {
      profile: homeowner.profile,
      accounts: [
        ...homeownerOthers,
        joint(homeownerHome, shareA),
        joint(homeownerMortgage, shareA),
      ],
    },
    b: {
      profile: debtStressed.profile,
      accounts: [
        ...debtStressed.accounts,
        joint({ ...partnerHome, ...partnerOverrides.home }, shareB),
        joint(partnerMortgage, shareB),
      ],
    },
    jointAccounts: HOME_LINKS,
  };
}

describe("a renting household (Sam and Dan, a joint bills account)", () => {
  const picture = buildHouseholdPicture(renting(), { taxYear: "2026/27" });

  it("counts the joint bills account once, in full", () => {
    // Sam 1,850 + 4,200 = 6,050; Dan 2,400 + 9,000 + 235,000 = 246,400; bills 1,200 once.
    expect(picture.netWorth.totalAssets).toBe(253650);
    // Dan's buy-to-let mortgage only; Sam's student loan is left out by default (D-5-B).
    expect(picture.netWorth.totalLiabilities).toBe(150000);
    expect(picture.netWorth.netWorth).toBe(103650);
    // 6,050 + 11,400 + 1,200.
    expect(picture.netWorth.liquidCash).toBe(18650);
    expect(picture.netWorth.studentLoans).toBe(41500);
    expect(picture.jointItems).toEqual({
      countedOnce: 1,
      sharesNotSummingTo100: 0,
      copiesDiffer: 0,
      notLinked: 0,
      ignoredLinks: 0,
    });
  });

  it("uses the household's own net worth choices, not either person's", () => {
    const counted = buildHouseholdPicture(
      { ...renting(), netWorthBasis: { countProperty: true, countStudentLoan: true } },
      { taxYear: "2026/27" },
    );
    // 103,650 - 41,500 student loan; liabilities 150,000 + 41,500.
    expect(counted.netWorth.netWorth).toBe(62150);
    expect(counted.netWorth.totalLiabilities).toBe(191500);
    const noProperty = buildHouseholdPicture(
      { ...renting(), netWorthBasis: { countProperty: false, countStudentLoan: false } },
      { taxYear: "2026/27" },
    );
    // 103,650 - 235,000 buy-to-let + 150,000 its mortgage.
    expect(noProperty.netWorth.netWorth).toBe(18650);
  });

  it("adds each person's own tax, worked out separately", () => {
    // Sam: 38,000 less 5% pension (1,900, net pay) = 36,100; (36,100 - 12,570) x 20% = 4,706.
    // Dan: 46,000 less 5% pension (2,300) = 43,700; (43,700 - 12,570) x 20% = 6,226.
    // Household income tax 4,706 + 6,226 = 10,932.
    // NI on pay before pension: (38,000 - 12,570) x 8% = 2,034.40; (46,000 - 12,570) x 8% =
    // 2,674.40; together 4,708.80.
    expect(picture.takeHome.status).toBe("known");
    if (picture.takeHome.status !== "known") return;
    expect(picture.takeHome.value.incomeTax).toBe(10932);
    expect(picture.takeHome.value.nationalInsurance).toBe(4708.8);
  });

  it("counts an unlinked joint account at each owner's own share", () => {
    const unlinked = buildHouseholdPicture(renting([]), { taxYear: "2026/27" });
    // 600 + 600: the same 1,200, because the two shares add up to 100%.
    expect(unlinked.netWorth.liquidCash).toBe(18650);
    expect(unlinked.jointItems.notLinked).toBe(2);
    expect(unlinked.jointItems.countedOnce).toBe(0);
  });
});

describe("a home-owning household (a joint home and mortgage)", () => {
  it("counts the home and mortgage once in full when the shares add up to 100%", () => {
    const picture = buildHouseholdPicture(owning(50, 50));
    // Assets: home 310,000 + cash 21,000 + pension 96,000 + partner's saver 120 (an overdrawn
    // current account is a liability, C-15).
    expect(picture.netWorth.totalAssets).toBe(427120);
    // Liabilities: mortgage 186,000 + card 1,800 + loan 7,200 + partner's 15,010.
    expect(picture.netWorth.totalLiabilities).toBe(210010);
    expect(picture.netWorth.netWorth).toBe(217110);
    expect(picture.netWorth.property).toBe(310000);
    expect(picture.netWorth.homeEstimate).toBe(310000);
    // 9,000 + 15,010.
    expect(picture.debt.consumerDebt).toBe(24010);
    expect(picture.debt.mortgage).toBe(186000);
    expect(picture.jointItems.countedOnce).toBe(2);
    expect(picture.jointItems.sharesNotSummingTo100).toBe(0);
  });

  it("still counts the whole once when the shares add up to more or less than 100%", () => {
    // 60% + 60% and 30% + 30%: the household counts the whole home and mortgage once, never
    // 120% or 60% of them. Same totals as the 50/50 case.
    for (const [x, y] of [
      [60, 60],
      [30, 30],
    ] as const) {
      const picture = buildHouseholdPicture(owning(x, y));
      expect(picture.netWorth.property, `${x}/${y}`).toBe(310000);
      expect(picture.debt.mortgage, `${x}/${y}`).toBe(186000);
      expect(picture.netWorth.netWorth, `${x}/${y}`).toBe(217110);
      expect(picture.jointItems.sharesNotSummingTo100, `${x}/${y}`).toBe(2);
    }
  });

  it("counts each person's own share when their whole figures differ", () => {
    // The partner saved the home at 300,000. Neither figure is picked: 50% of 310,000 + 50% of
    // 300,000 = 155,000 + 150,000 = 305,000, as the two own pictures count it.
    const picture = buildHouseholdPicture(owning(50, 50, { home: { balance: 300000 } }));
    expect(picture.netWorth.property).toBe(305000);
    expect(picture.debt.mortgage).toBe(186000);
    expect(picture.jointItems.copiesDiffer).toBe(1);
    expect(picture.jointItems.countedOnce).toBe(1);
  });

  it("counts each person's own share when the copies are named or typed differently", () => {
    // The label decides the home estimate, so one copy cannot stand for both: 155,000 + 155,000
    // counted as each person counts it, with half labelled as the estimate.
    const picture = buildHouseholdPicture(owning(50, 50, { home: { name: "Our home" } }));
    expect(picture.netWorth.property).toBe(310000);
    expect(picture.netWorth.homeEstimate).toBe(155000);
    expect(picture.jointItems.copiesDiffer).toBe(1);
    for (const change of [
      { accountSubtype: "btl" },
      { creditLimit: 100 },
      { currency: "EUR" },
      { promoZeroPercentUntil: "2027-01-01" },
    ]) {
      const p = buildHouseholdPicture(owning(50, 50, { home: change }));
      expect(p.jointItems.copiesDiffer, JSON.stringify(change)).toBe(1);
    }
  });

  it("points a mortgage at the kept copy of its home", () => {
    // Homes agree, mortgages differ: the partner's mortgage stays and its home link moves to the
    // homeowner's kept copy, never to the dropped one.
    const input = owning(50, 50);
    const { accounts } = combineHouseholdAccounts(
      input.a.accounts,
      input.b.accounts.map((acc) =>
        acc.id === "partner-mortgage" ? { ...acc, balance: 180000 } : acc,
      ),
      HOME_LINKS,
    );
    const partnerMortgageRow = accounts.find((acc) => acc.id === "b:partner-mortgage");
    expect(partnerMortgageRow?.linkedAccountId).toBe("a:homeowner-home");
    expect(accounts.some((acc) => acc.id === "b:partner-home")).toBe(false);
  });

  it("treats a student loan saved with either sign as the same whole", () => {
    const a = [joint({ id: "x", type: "Student Loan", balance: 900 }, 50)];
    const b = [joint({ id: "y", type: "Student Loan", balance: -900 }, 50)];
    expect(combineHouseholdAccounts(a, b, [{ a: "x", b: "y" }]).jointItems.countedOnce).toBe(1);
  });

  it("treats a liability saved with either sign as the same whole", () => {
    const input = owning(50, 50);
    const flipped: HouseholdPictureInput = {
      ...input,
      b: {
        ...input.b,
        accounts: input.b.accounts.map((acc) =>
          acc.id === "partner-mortgage" ? { ...acc, balance: -186000 } : acc,
        ),
      },
    };
    const picture = buildHouseholdPicture(flipped);
    expect(picture.debt.mortgage).toBe(186000);
    expect(picture.jointItems.countedOnce).toBe(2);
  });

  it("never treats an asset saved with the opposite sign as the same whole", () => {
    const a = [joint({ id: "x", type: "Current", balance: 500 }, 50)];
    const b = [joint({ id: "y", type: "Current", balance: -500 }, 50)];
    const { jointItems } = combineHouseholdAccounts(a, b, [{ a: "x", b: "y" }]);
    expect(jointItems.copiesDiffer).toBe(1);
  });

  it("needs the monthly amount and the rate to agree as well as the balance", () => {
    const base = { type: "Loan", balance: 5000, interestRate: 6, monthlyContribution: 150 };
    const a = [joint({ id: "x", ...base }, 50)];
    for (const change of [{ interestRate: 7 }, { monthlyContribution: 160 }, { balance: 5001 }]) {
      const b = [joint({ id: "y", ...base, ...change }, 50)];
      const { jointItems } = combineHouseholdAccounts(a, b, [{ a: "x", b: "y" }]);
      expect(jointItems.copiesDiffer, JSON.stringify(change)).toBe(1);
    }
    const same = combineHouseholdAccounts(
      a,
      [joint({ id: "y", ...base }, 50)],
      [{ a: "x", b: "y" }],
    );
    expect(same.jointItems.countedOnce).toBe(1);
    // The loan counts once at its whole 5,000 with its whole 150 a month.
    expect(same.accounts).toHaveLength(1);
    expect(same.accounts[0]).toMatchObject({ balance: 5000, monthlyContribution: 150 });
  });

  it("gives the same household figures whichever person is first", () => {
    for (const input of [
      owning(50, 50),
      owning(60, 60),
      owning(50, 50, { home: { balance: 1 } }),
      // Only one copy carries the home estimate label: whose copy is kept must not matter.
      owning(50, 50, { home: { name: "Our home" } }),
      owning(50, 50, { home: { accountSubtype: "btl" } }),
    ]) {
      const swapped: HouseholdPictureInput = {
        a: input.b,
        b: input.a,
        jointAccounts: (input.jointAccounts ?? []).map((l) => ({ a: l.b, b: l.a })),
      };
      expect(buildHouseholdPicture(swapped)).toEqual(buildHouseholdPicture(input));
    }
  });
});

describe("links that cannot be used", () => {
  const current = (id: string, extra: Partial<RawAccount> = {}) =>
    joint({ id, type: "Current", balance: 1000, ...extra }, 50);

  it("ignores a link to a missing account, a reused account, a sole account or another kind", () => {
    const a = [current("a1"), current("a2"), { id: "a3", type: "Current", balance: 1000 }];
    const b = [
      current("b1"),
      current("b2"),
      joint({ id: "b3", type: "Saving", balance: 1000 }, 50),
    ];
    const { jointItems, accounts } = combineHouseholdAccounts(a, b, [
      { a: "a1", b: "b1" }, // used
      { a: "a1", b: "b2" }, // a1 already used
      { a: "missing", b: "b2" },
      { a: "a3", b: "b2" }, // a3 is sole
      { a: "a2", b: "b3" }, // current and saving
    ]);
    expect(jointItems.ignoredLinks).toBe(4);
    expect(jointItems.countedOnce).toBe(1);
    // a2, b2 and b3 are joint with no usable link.
    expect(jointItems.notLinked).toBe(3);
    // Six rows less the dropped copy of the linked pair.
    expect(accounts).toHaveLength(5);
  });

  it("never links an ISA or a pension, which cannot be joint", () => {
    const a = [joint({ id: "isa", name: "Cash ISA", type: "Saving", balance: 4000 }, 50)];
    const b = [joint({ id: "isa2", name: "Cash ISA", type: "Saving", balance: 4000 }, 50)];
    const { jointItems, accounts } = combineHouseholdAccounts(a, b, [{ a: "isa", b: "isa2" }]);
    expect(jointItems.ignoredLinks).toBe(1);
    // Each ISA is its holder's alone and counts in full: 4,000 + 4,000.
    expect(accounts).toHaveLength(2);
  });

  it("keeps two people's accounts apart when they share an id", () => {
    const { accounts } = combineHouseholdAccounts(
      [{ id: "same", type: "Current", balance: 10 }],
      [{ id: "same", type: "Current", balance: 20 }],
    );
    expect(accounts.map((x) => x.id)).toEqual(["a:same", "b:same"]);
    const picture = buildHouseholdPicture({
      a: { profile: sam.profile, accounts: [{ id: "same", type: "Current", balance: 10 }] },
      b: { profile: dan.profile, accounts: [{ id: "same", type: "Current", balance: 20 }] },
    });
    expect(picture.netWorth.liquidCash).toBe(30);
  });

  it("keeps a mortgage pointing at its own person's home", () => {
    const { accounts } = combineHouseholdAccounts(
      [
        { id: "h", type: "Property", balance: 100 },
        { id: "m", type: "Mortgage", balance: 50, linkedAccountId: "h" },
      ],
      [],
    );
    expect(accounts[1]?.linkedAccountId).toBe("a:h");
  });
});

describe("household take-home", () => {
  it("works out each person's tax in their own region", () => {
    const household = selectHouseholdTakeHome(sam.profile, scottish.profile, {
      taxYear: "2026/27",
    });
    const own = [sam.profile, scottish.profile].map((p) =>
      selectTakeHome(p, { taxYear: "2026/27" }),
    );
    const asEngland = selectTakeHome(
      { ...scottish.profile, taxRegion: "ENGLAND" },
      { taxYear: "2026/27" },
    );
    if (
      household.status !== "known" ||
      own[0]?.status !== "known" ||
      own[1]?.status !== "known" ||
      asEngland.status !== "known"
    ) {
      throw new Error("expected known take-home figures");
    }
    expect(household.value.incomeTax).toBe(
      Math.round(((own[0].value.incomeTax ?? 0) + (own[1].value.incomeTax ?? 0)) * 100) / 100,
    );
    // Scottish and England tax on 50,000 differ, so taxing both people as one region would show.
    expect(own[1].value.incomeTax).not.toBe(asEngland.value.incomeTax);
    expect(household.value.annual).toBe(
      Math.round((own[0].value.annual + own[1].value.annual) * 100) / 100,
    );
  });

  it("is unknown when either person's take-home is unknown, without saying whose", () => {
    const noSalary: ProfileFacts = { ...dan.profile, annualSalary: null, monthlyTakeHome: null };
    for (const [x, y] of [
      [sam.profile, noSalary],
      [noSalary, sam.profile],
    ] as const) {
      const fig = selectHouseholdTakeHome(x, y, { taxYear: "2026/27" });
      expect(fig.status).toBe("unknown");
      if (fig.status === "unknown") expect(fig.missing).toContain("annualSalary");
    }
  });

  it("adds a typed take-home but leaves the tax unknown", () => {
    const typed: ProfileFacts = { ...dan.profile, annualSalary: null, monthlyTakeHome: 2000 };
    const fig = selectHouseholdTakeHome(typed, typed, { taxYear: "2026/27" });
    expect(fig.status).toBe("known");
    if (fig.status !== "known") return;
    // 2,000 + 2,000 a month, typed by each person.
    expect(fig.value.monthly).toBe(4000);
    expect(fig.value.incomeTax).toBeNull();
    expect(fig.value.nationalInsurance).toBeNull();
  });
});

describe("householdIncomeTax vectors (E34 C2, hand-derived)", () => {
  const employee = (annualSalary: number, region: string): ProfileFacts => ({
    annualSalary,
    employmentType: "employed",
    taxRegion: region === "SCOTLAND" ? "SCOTLAND" : "ENGLAND",
    studentLoanPlans: [],
    pensionPercent: 0,
    isSalarySacrifice: false,
  });
  const vectors = selectUkWhatIfVectors({ kind: "householdIncomeTax" });
  it("has vectors", () => expect(vectors.length).toBeGreaterThan(0));
  for (const v of vectors) {
    it(v.id, () => {
      const picture = buildHouseholdPicture(
        {
          a: { profile: employee(v.input.grossIncomeA as number, v.region), accounts: [] },
          b: { profile: employee(v.input.grossIncomeB as number, v.region), accounts: [] },
        },
        { taxYear: v.taxYear as UkTaxYear },
      );
      expect(picture.takeHome.status).toBe("known");
      if (picture.takeHome.status === "known") {
        expect(picture.takeHome.value.incomeTax).toBe(v.expected);
      }
    });
  }
});

describe("household edges", () => {
  const loan = (id: string, extra: Partial<RawAccount>) =>
    joint({ id, type: "Loan", balance: 5000, interestRate: 6, ...extra }, 50);
  const agreeOn = (x: Partial<RawAccount>, y: Partial<RawAccount>) =>
    combineHouseholdAccounts([loan("x", x)], [loan("y", y)], [{ a: "x", b: "y" }]).jointItems
      .countedOnce === 1;

  it("tells a missing figure from a stored 0", () => {
    // A missing monthly amount (undefined, null or "") is not the same as 0 a month.
    for (const missing of [undefined, null, ""]) {
      expect(agreeOn({ monthlyContribution: missing }, { monthlyContribution: 0 })).toBe(false);
    }
    expect(agreeOn({ monthlyContribution: undefined }, { monthlyContribution: "" })).toBe(true);
    expect(agreeOn({ monthlyContribution: null }, { monthlyContribution: undefined })).toBe(true);
    expect(agreeOn({ balance: undefined }, { balance: 0 })).toBe(false);
    expect(agreeOn({ balance: "5000" }, { balance: 5000 })).toBe(true);
    // A text field missing in one copy and null in the other is missing in both.
    expect(agreeOn({ accountSubtype: null }, { accountSubtype: undefined })).toBe(true);
    expect(agreeOn({ accountSubtype: "" }, { accountSubtype: null })).toBe(true);
  });

  it("counts a joint account with no link when no links are given", () => {
    const { jointItems } = combineHouseholdAccounts([loan("x", {})], []);
    expect(jointItems).toEqual({
      countedOnce: 0,
      sharesNotSummingTo100: 0,
      copiesDiffer: 0,
      notLinked: 1,
      ignoredLinks: 0,
    });
  });

  it("ignores a link whose second account is not joint", () => {
    const { jointItems } = combineHouseholdAccounts(
      [loan("x", {})],
      [{ id: "y", type: "Loan", balance: 5000, interestRate: 6 }],
      [{ a: "x", b: "y" }],
    );
    expect(jointItems.ignoredLinks).toBe(1);
    expect(jointItems.notLinked).toBe(1);
  });

  it("gives accounts without an id their own place", () => {
    const { accounts } = combineHouseholdAccounts(
      [{ type: "Current", balance: 1 }],
      [{ type: "Current", balance: 2 }],
    );
    expect(accounts.map((x) => x.id)).toEqual(["a:acc_0", "b:acc_0"]);
    // Two joint accounts without an id are two items, not one.
    const two = combineHouseholdAccounts(
      [joint({ type: "Current", balance: 1 }, 50), joint({ type: "Current", balance: 2 }, 50)],
      [],
    );
    expect(two.jointItems.notLinked).toBe(2);
  });

  it("keeps an empty or missing home link as it was", () => {
    const { accounts } = combineHouseholdAccounts(
      [
        { id: "m1", type: "Mortgage", balance: 1, linkedAccountId: "" },
        { id: "m2", type: "Mortgage", balance: 1, linkedAccountId: null },
      ],
      [],
    );
    expect(accounts.map((x) => x.linkedAccountId)).toEqual(["", null]);
  });

  it("uses the tax year asked for", () => {
    const fig = selectHouseholdTakeHome(sam.profile, dan.profile, { taxYear: "2025/26" });
    const own = [sam.profile, dan.profile].map((p) => selectTakeHome(p, { taxYear: "2025/26" }));
    if (fig.status !== "known" || own[0]?.status !== "known" || own[1]?.status !== "known") {
      throw new Error("expected known take-home figures");
    }
    expect(fig.value.incomeTax).toBe(
      Math.round(((own[0].value.incomeTax ?? 0) + (own[1].value.incomeTax ?? 0)) * 100) / 100,
    );
    const current = selectHouseholdTakeHome(sam.profile, dan.profile, { taxYear: "2026/27" });
    if (current.status !== "known") throw new Error("expected known");
    // 2026/27 totals 10,932 (worked above); 2025/26 Plan 2 and NI figures differ, so the annual
    // take-home differs.
    expect(fig.value.annual).not.toBe(current.value.annual);
  });

  it("names exactly the facts that are missing, and passes on a refusal and its notice", () => {
    const noSalary: ProfileFacts = { ...dan.profile, annualSalary: null, monthlyTakeHome: null };
    const single = selectTakeHome(noSalary, { taxYear: "2026/27" });
    const fig = selectHouseholdTakeHome(sam.profile, noSalary, { taxYear: "2026/27" });
    expect(single.status).toBe("unknown");
    if (single.status === "unknown") expect(fig).toEqual(single);
    // Scottish rates for 2027/28 are not published, so the take-home is refused with a notice.
    const scot = selectTakeHome(scottish.profile, { taxYear: "2027/28" });
    for (const [x, y] of [
      [scottish.profile, sam.profile],
      [sam.profile, scottish.profile],
    ] as const) {
      expect(selectHouseholdTakeHome(x, y, { taxYear: "2027/28" })).toEqual(scot);
    }
  });

  it("gives the same unknown figure whichever person is first when both are unknown", () => {
    const noSalary: ProfileFacts = { ...dan.profile, annualSalary: null, monthlyTakeHome: null };
    const refused = selectHouseholdTakeHome(scottish.profile, noSalary, { taxYear: "2027/28" });
    const swapped = selectHouseholdTakeHome(noSalary, scottish.profile, { taxYear: "2027/28" });
    expect(swapped).toEqual(refused);
    expect(refused.status).toBe("unknown");
    const scot = selectTakeHome(scottish.profile, { taxYear: "2027/28" });
    if (refused.status !== "unknown" || scot.status !== "unknown") throw new Error("unknown");
    expect(refused.missing).toContain("annualSalary");
    // The refusal and its notice are passed on, whichever person it belongs to.
    expect(refused.reason).toBe("rates-not-published");
    expect(refused.notice).toBe(scot.notice);
  });

  it("names an unsupported year over facts not set, whichever person is first", () => {
    // A person with facts missing is "not-set" before the year is checked; a person with every
    // fact gets "unsupported-year". The household reason must not depend on the order.
    const noSalary: ProfileFacts = { ...dan.profile, annualSalary: null, monthlyTakeHome: null };
    const year = "2010/11" as UkTaxYear;
    const one = selectHouseholdTakeHome(sam.profile, noSalary, { taxYear: year });
    const two = selectHouseholdTakeHome(noSalary, sam.profile, { taxYear: year });
    expect(one).toEqual(two);
    expect(one.status === "unknown" && one.reason).toBe("unsupported-year");
  });

  it("leaves the tax unknown when one take-home is typed and the other worked out", () => {
    const typed: ProfileFacts = { ...dan.profile, annualSalary: null, monthlyTakeHome: 2000 };
    for (const [x, y] of [
      [typed, sam.profile],
      [sam.profile, typed],
    ] as const) {
      const fig = selectHouseholdTakeHome(x, y, { taxYear: "2026/27" });
      if (fig.status !== "known") throw new Error("expected known");
      expect(fig.value.incomeTax).toBeNull();
      expect(fig.value.nationalInsurance).toBeNull();
      expect(fig.provenance).toBe("derived");
    }
  });

  it("carries an assumption behind either person's take-home into the total", () => {
    const assumedRegion: ProfileFacts = { ...dan.profile, taxRegion: null };
    const own = selectTakeHome(assumedRegion, { taxYear: "2026/27" });
    if (own.status !== "known") throw new Error("expected known");
    for (const [x, y] of [
      [assumedRegion, sam.profile],
      [sam.profile, assumedRegion],
    ] as const) {
      const fig = selectHouseholdTakeHome(x, y, { taxYear: "2026/27" });
      if (fig.status !== "known") throw new Error("expected known");
      expect(fig.provenance).toBe("assumption");
      expect(fig.assumptions).toEqual(own.assumptions);
    }
    // The same assumption from both people is listed once.
    const both = selectHouseholdTakeHome(assumedRegion, assumedRegion, { taxYear: "2026/27" });
    if (both.status !== "known") throw new Error("expected known");
    expect(both.assumptions).toEqual(own.assumptions);
    const none = selectHouseholdTakeHome(sam.profile, dan.profile, { taxYear: "2026/27" });
    expect(none.status === "known" && none.provenance).toBe("derived");
    expect(none.status === "known" && none.assumptions).toBeUndefined();
  });
});
