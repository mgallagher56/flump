import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Account } from "~/containers/accounts/types";
import customRender from "~/testUtils/customRender";
import SavingsAccountsList, { calculateOneYearCompoundInterest } from "./SavingsAccountsList";

const mockSubmit = vi.fn();
const fetcherData = { current: null as unknown };
vi.mock("react-router", async () => {
  const actual = await vi.importActual<any>("react-router");
  return {
    ...actual,
    useFetcher: () => ({
      submit: mockSubmit,
      state: "idle",
      data: fetcherData.current,
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

  test("edits balance from the keyboard", async () => {
    const user = userEvent.setup();
    customRender(<SavingsAccountsList accounts={mockAccounts} onOpenAddModal={vi.fn()} />);
    const btn = screen.getAllByRole("button", {
      name: "Edit balance for Marcus High Yield Saver",
    })[0];
    btn.focus();
    await user.keyboard("{Enter}");
    expect((screen.getAllByRole("spinbutton")[0] as HTMLInputElement).value).toBe("10000");
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
      fetcherData.current = null;
    });

    test("a failed delete shows the error inline and keeps the dialog open; success closes it", () => {
      const ui = () => (
        <SavingsAccountsList accounts={mockAccounts} onOpenAddModal={vi.fn()} variant="desktop" />
      );
      const { rerender } = customRender(ui());
      fireEvent.click(screen.getAllByRole("button", { name: "Delete Marcus High Yield Saver" })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      expect(screen.getByRole("button", { name: "Delete account" }).hasAttribute("disabled")).toBe(
        true,
      );

      fetcherData.current = {
        success: false,
        error: "We couldn't reach the server. Please try again.",
      };
      rerender(ui());
      expect(within(screen.getByRole("alertdialog")).getByRole("alert").textContent).toBe(
        "We couldn't reach the server. Please try again.",
      );
      expect(screen.getByRole("button", { name: "Delete account" }).hasAttribute("disabled")).toBe(
        false,
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      fetcherData.current = { success: true };
      rerender(ui());
      expect(screen.queryByRole("alertdialog")).toBeNull();
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
