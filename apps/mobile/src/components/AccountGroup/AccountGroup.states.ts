import { createElement } from "react";
import { AccountRow } from "../AccountRow";
import { accountRowStates } from "../AccountRow/AccountRow.states";
import type { AccountGroupProps } from "./AccountGroup";

const rows = (...names: (keyof typeof accountRowStates)[]) =>
  names.map((name) => createElement(AccountRow, { key: name, ...accountRowStates[name] }));

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const accountGroupStates = {
  withTotal: {
    title: "What you own",
    description: "Money and property you own, from your saved balances.",
    children: rows("nameSaysType", "asset"),
    total: { label: "Total you own", value: 11000 },
  },
  oneRow: {
    title: "What you owe",
    description: "Your debts, from your saved balances.",
    children: rows("jointDebt"),
  },
  withFootnote: {
    title: "Not counted in net worth",
    description: "Accounts your net worth choices leave out.",
    children: rows("noBalance"),
    footnote:
      "Repayments come out of your pay as you earn, and any balance left at the end of the repayment term is written off.",
  },
} satisfies Record<string, AccountGroupProps>;
