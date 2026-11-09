import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
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
});
