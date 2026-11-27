import type { BreathingRoomProps } from "./BreathingRoom";

const noop = async () => undefined;

/** The renter persona: £8,200 easy access savings over £1,615 of essentials a month. */
const renter: BreathingRoomProps = {
  figure: { months: 5.08, liquidCash: 8200, monthlyEssentials: 1615 },
  drawOn: [{ id: "savings", name: "Easy access savings", balance: 8200 }],
  spending: [
    {
      id: "rent",
      name: "Rent",
      category: "housing",
      monthly: 950,
      fixedReason: null,
      counted: true,
      editable: true,
    },
    {
      id: "eating",
      name: "Eating out",
      category: "expenses",
      monthly: 90,
      fixedReason: null,
      counted: false,
      editable: true,
    },
    {
      id: "card",
      name: "Credit card payment",
      category: "debt",
      monthly: 60,
      fixedReason: "debt",
      counted: true,
      editable: true,
    },
  ],
  counted: 2,
  onSetEssential: noop,
  onViewSavings: () => undefined,
};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const breathingRoomStates = {
  renter,
  notSet: { ...renter, figure: null, drawOn: [], spending: [], counted: 0 },
  readOnlyRow: {
    ...renter,
    spending: [
      {
        id: "joint",
        name: "Shared groceries",
        category: "expenses",
        monthly: 200,
        fixedReason: null,
        counted: true,
        editable: false,
      },
    ],
    counted: 1,
  },
} satisfies Record<string, BreathingRoomProps>;
