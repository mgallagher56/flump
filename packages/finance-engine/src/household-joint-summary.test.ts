import { describe, expect, it } from "vitest";
import {
  type JointSummaryAccount,
  type JointSummarySource,
  selectJointSummaryItems,
} from "./household-joint-summary.js";

const joint = (name: string, type: string, balance: number): JointSummaryAccount => ({
  name,
  type,
  balance,
  ownership: "joint",
  sharePercent: 30,
});
const sole = (name: string, type: string, balance: number): JointSummaryAccount => ({
  name,
  type,
  balance,
  ownership: "sole",
});

describe("selectJointSummaryItems (E34 C3)", () => {
  it("returns nothing for no sources, or for sources with no accounts", () => {
    expect(selectJointSummaryItems([])).toEqual([]);
    expect(
      selectJointSummaryItems([{ addedBy: "you", sharesJointSummary: true, accounts: [] }]),
    ).toEqual([]);
  });

  it("keeps only joint accounts, at the whole stored balance with no share applied", () => {
    // Joint current account at £1,234.56 with a 30% share: the summary shows £1,234.56, not
    // £370.37 (30% of it). The sole saver is left out.
    expect(
      selectJointSummaryItems([
        {
          addedBy: "you",
          sharesJointSummary: true,
          accounts: [joint("House bills", "Current", 1234.56), sole("My saver", "Saving", 900)],
        },
      ]),
    ).toEqual([{ name: "House bills", type: "Current", wholeBalance: 1234.56, addedBy: "you" }]);
  });

  it("keeps a negative balance as stored (a joint mortgage is a debt)", () => {
    // Stored liability balances are negative (BE-05): -180,000.00 stays -180,000.00.
    expect(
      selectJointSummaryItems([
        {
          addedBy: "other",
          sharesJointSummary: true,
          accounts: [joint("Home loan", "Mortgage", -180000)],
        },
      ]),
    ).toEqual([{ name: "Home loan", type: "Mortgage", wholeBalance: -180000, addedBy: "other" }]);
  });

  it("never shows an ISA or a pension, even when stored as joint", () => {
    expect(
      selectJointSummaryItems([
        {
          addedBy: "you",
          sharesJointSummary: true,
          accounts: [
            { ...joint("Rainy day", "Saving", 500), accountSubtype: "cash_isa" },
            joint("Work pension", "Pension", 20000),
            joint("Joint saver", "Saving", 750),
          ],
        },
      ]),
    ).toEqual([{ name: "Joint saver", type: "Saving", wholeBalance: 750, addedBy: "you" }]);
  });

  it("shows nothing of a member who does not share, the same as one with no joint accounts (G3)", () => {
    const mine: JointSummarySource = {
      addedBy: "you",
      sharesJointSummary: true,
      accounts: [joint("Bills", "Current", 300)],
    };
    const notSharing = selectJointSummaryItems([
      mine,
      { addedBy: "other", sharesJointSummary: false, accounts: [joint("Car", "Loan", -4000)] },
    ]);
    const sharingNone = selectJointSummaryItems([
      mine,
      { addedBy: "other", sharesJointSummary: true, accounts: [sole("Car", "Loan", -4000)] },
    ]);
    const expected = [{ name: "Bills", type: "Current", wholeBalance: 300, addedBy: "you" }];
    expect(notSharing).toEqual(expected);
    expect(sharingNone).toEqual(expected);
  });

  it("shows the viewer's own joint accounts only when the viewer shares too", () => {
    expect(
      selectJointSummaryItems([
        { addedBy: "you", sharesJointSummary: false, accounts: [joint("Bills", "Current", 300)] },
        { addedBy: "other", sharesJointSummary: true, accounts: [joint("Car", "Loan", -4000)] },
      ]),
    ).toEqual([{ name: "Car", type: "Loan", wholeBalance: -4000, addedBy: "other" }]);
  });

  it("orders by name, then type, mixing both people's items (never grouped by person)", () => {
    const items = selectJointSummaryItems([
      {
        addedBy: "you",
        sharesJointSummary: true,
        accounts: [joint("Zoo fund", "Saving", 10), joint("bills", "Saving", 20)],
      },
      {
        addedBy: "other",
        sharesJointSummary: true,
        accounts: [joint("Bills", "Current", 30), joint("Mortgage", "Mortgage", -40)],
      },
    ]);
    // Case-folded names: "bills", "bills", "mortgage", "zoo fund". The two "bills" differ in case:
    // "Bills" (B = 66) sorts before "bills" (b = 98) on the exact name.
    expect(items.map((i) => [i.name, i.type, i.addedBy])).toEqual([
      ["Bills", "Current", "other"],
      ["bills", "Saving", "you"],
      ["Mortgage", "Mortgage", "other"],
      ["Zoo fund", "Saving", "you"],
    ]);
  });

  it("breaks a tie on name by type, then by balance, then by whose record it is", () => {
    const items = selectJointSummaryItems([
      {
        addedBy: "you",
        sharesJointSummary: true,
        accounts: [joint("Bills", "Saving", 50), joint("Bills", "Current", 70)],
      },
      {
        addedBy: "other",
        sharesJointSummary: true,
        accounts: [joint("Bills", "Current", 60), joint("Bills", "Saving", 50)],
      },
    ]);
    // Current before Saving; within Current 60 before 70; within Saving both 50, so "other" before
    // "you" (o < y).
    expect(items).toEqual([
      { name: "Bills", type: "Current", wholeBalance: 60, addedBy: "other" },
      { name: "Bills", type: "Current", wholeBalance: 70, addedBy: "you" },
      { name: "Bills", type: "Saving", wholeBalance: 50, addedBy: "other" },
      { name: "Bills", type: "Saving", wholeBalance: 50, addedBy: "you" },
    ]);
  });

  it("lists an account both people added twice, once per record, with no total", () => {
    const items = selectJointSummaryItems([
      { addedBy: "you", sharesJointSummary: true, accounts: [joint("Bills", "Current", 412.5)] },
      { addedBy: "other", sharesJointSummary: true, accounts: [joint("Bills", "Current", 412.5)] },
    ]);
    expect(items).toEqual([
      { name: "Bills", type: "Current", wholeBalance: 412.5, addedBy: "other" },
      { name: "Bills", type: "Current", wholeBalance: 412.5, addedBy: "you" },
    ]);
  });
});
