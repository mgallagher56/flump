/*
 * PROTOTYPE ONLY (app design prototypes branch, never merged): the screens the index page lists.
 * `stack` says which local stack serves it: `data` is the seeded "everything" household, `empty`
 * a household that finished setup with nothing else saved, `new` a user who has not started setup
 * and `checkin` a household whose monthly check-in is finished.
 */
export type ProtoStack = "data" | "empty" | "new" | "checkin";

export interface ProtoScreen {
  id: string;
  name: string;
  path: string;
  stack: ProtoStack;
  note?: string;
}

export const PROTO_SCREENS: readonly ProtoScreen[] = [
  { id: "home", name: "Home dashboard", path: "/", stack: "data" },
  { id: "home-empty", name: "Home dashboard, empty", path: "/", stack: "empty" },
  { id: "accounts", name: "Accounts", path: "/app/accounts", stack: "data" },
  {
    id: "account-detail",
    name: "One account with its history",
    path: "/app/accounts/:first",
    stack: "data",
  },
  { id: "history", name: "Net worth history", path: "/app/accounts/history", stack: "data" },
  { id: "budget", name: "Budget", path: "/app/budget", stack: "data" },
  { id: "pay", name: "Pay (take-home)", path: "/app/take-home", stack: "data" },
  { id: "debt", name: "Debt and borrowing", path: "/app/debt", stack: "data" },
  { id: "savings", name: "Savings", path: "/app/savings", stack: "data" },
  { id: "pension", name: "Pension", path: "/app/pension", stack: "data" },
  {
    id: "check-in-step",
    name: "Monthly check-in, a step",
    path: "/app/accounts/history?checkIn=1",
    stack: "data",
  },
  {
    id: "check-in-done",
    name: "Monthly check-in, finished",
    path: "/app/accounts/history?checkIn=1",
    stack: "checkin",
  },
  { id: "onboarding", name: "Onboarding, first step", path: "/app/onboarding", stack: "new" },
  { id: "settings", name: "Settings", path: "/app/profile", stack: "data" },
  { id: "empty-state", name: "An empty state (Debt)", path: "/app/debt", stack: "empty" },
  {
    id: "error-state",
    name: "An error state (account not found)",
    path: "/app/accounts/not-a-real-account",
    stack: "data",
  },
];

export const PROTO_WIDTHS = [390, 1000, 1440] as const;
