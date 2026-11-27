import type { AccountRowProps } from "./AccountRow";

const noop = () => {};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const accountRowStates = {
  asset: { name: "Easy access savings", typeLine: "Savings", balance: 7600, onPress: noop },
  nameSaysType: { name: "Current account", typeLine: null, balance: 3400, onPress: noop },
  jointDebt: {
    name: "Residential mortgage",
    typeLine: "Mortgage · Joint, 50%",
    balance: 93000,
    onPress: noop,
  },
  overdrawn: { name: "Current account", typeLine: null, balance: 350, onPress: noop },
  noBalance: { name: "Pension", typeLine: null, balance: undefined, onPress: noop },
  longName: {
    name: "Stocks and shares ISA with a much longer name than most",
    typeLine: "Stocks and Shares ISA",
    balance: 15500,
    onPress: noop,
  },
} satisfies Record<string, AccountRowProps>;
