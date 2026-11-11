import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Account } from "~/containers/accounts/types";
import customRender from "~/testUtils/customRender";
import SavingsAccountsList, { calculateOneYearCompoundInterest } from "./SavingsAccountsList";

const mockSubmit = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual<any>("react-router");
  return {
    ...actual,
    useFetcher: () => ({
      submit: mockSubmit,
      state: "idle",
      data: null,
    }),
    useNavigate: () => vi.fn(),
  };
});

describe("<SavingsAccountsList />", () => {
  const mockAccounts: Account[] = [
    {
      id: "acc-1",
      name: "Marcus High Yield Saver",
      type: "Savings",
      balance: 10000,
      interestRate: 4.75,
      monthlyContribution: 250,
      created_at: "2026-01-01",
      user_id: "u1",
    },
  ];

  test("calculateOneYearCompoundInterest calculates compound interest accurately", () => {
    const interest = calculateOneYearCompoundInterest(10000, 5, 0);
    expect(Math.round(interest)).toBe(512);

    expect(calculateOneYearCompoundInterest(10000, 0, 0)).toBe(0);
  });

  test("renders savings accounts table and data", () => {
    const onOpenAddModal = vi.fn();
    const { getByText } = customRender(
      <SavingsAccountsList accounts={mockAccounts} onOpenAddModal={onOpenAddModal} />,
    );

    expect(getByText("Savings and investment accounts")).toBeDefined();
    expect(getByText("Marcus High Yield Saver")).toBeDefined();

    const addBtn = getByText(/Add Account/);
    fireEvent.click(addBtn);
    expect(onOpenAddModal).toHaveBeenCalled();
  });

  test("renders empty state when no savings accounts exist", () => {
    const { getByText } = customRender(
      <SavingsAccountsList accounts={[]} onOpenAddModal={vi.fn()} />,
    );
    expect(getByText("No savings accounts found")).toBeDefined();
  });

  test("renders mobile variant layout", () => {
    const { getByText } = customRender(
      <SavingsAccountsList accounts={mockAccounts} onOpenAddModal={vi.fn()} variant="mobile" />,
    );
    expect(getByText("Marcus High Yield Saver")).toBeDefined();
  });

  describe("delete confirmation", () => {
    beforeEach(() => {
      mockSubmit.mockClear();
    });

    for (const variant of ["desktop", "mobile"] as const) {
      test(`${variant} trash opens the confirm and submits nothing`, () => {
        const confirmSpy = vi.fn();
        vi.stubGlobal("confirm", confirmSpy);
        customRender(
          <SavingsAccountsList
            accounts={mockAccounts}
            onOpenAddModal={vi.fn()}
            variant={variant}
          />,
        );
        fireEvent.click(
          screen.getAllByRole("button", { name: "Delete Marcus High Yield Saver" })[0],
        );
        const dialog = screen.getByRole("alertdialog", {
          name: "Delete Marcus High Yield Saver?",
        });
        expect(within(dialog).getByText(/savings account and its history/)).toBeDefined();
        expect(mockSubmit).not.toHaveBeenCalled();
        expect(confirmSpy).not.toHaveBeenCalled();
      });

      test(`${variant} confirm deletes once`, () => {
        customRender(
          <SavingsAccountsList
            accounts={mockAccounts}
            onOpenAddModal={vi.fn()}
            variant={variant}
          />,
        );
        fireEvent.click(
          screen.getAllByRole("button", { name: "Delete Marcus High Yield Saver" })[0],
        );
        fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
        expect(mockSubmit).toHaveBeenCalledTimes(1);
        expect(mockSubmit).toHaveBeenCalledWith(
          { intent: "deleteAccount", accountId: "acc-1" },
          { method: "POST", action: "/app/savings" },
        );
      });

      test(`${variant} cancel does nothing`, () => {
        customRender(
          <SavingsAccountsList
            accounts={mockAccounts}
            onOpenAddModal={vi.fn()}
            variant={variant}
          />,
        );
        fireEvent.click(
          screen.getAllByRole("button", { name: "Delete Marcus High Yield Saver" })[0],
        );
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(mockSubmit).not.toHaveBeenCalled();
      });
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
