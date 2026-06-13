import { fireEvent, waitFor } from "@testing-library/react";
import mockAccounts from "__mocks__/accounts";
import type { ReactNode } from "react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { currentMonth, currentYear } from "~/utils/utils";

import AccountsContainer from "./AccountsContainer";

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({ revalidate: vi.fn() })),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: mocks.mockUseRevalidator,
    Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
    useSubmit: () => ({ onSubmit: vi.fn() }),
  };
});

vi.mock("app/components/core/cards/AccountsCard", () => ({ default: () => "AccountsCard" }));
vi.mock("app/components/core/input/FLPInput", () => ({ default: () => "FLPInput" }));

describe("<AccountsContainer />", () => {
  test("should render as expected when no accounts exist", () => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts: [] });
    const { container } = customRender(<AccountsContainer />);
    expect(container).toMatchSnapshot();
  });

  test("should render as expected when accounts exist", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: mockAccounts,
      accountDetails: [
        {
          id: 1,
          account_id: mockAccounts[0].id,
          month: currentMonth,
          year: currentYear,
          value: 1000,
        },
        {
          id: 2,
          account_id: mockAccounts[6].id,
          month: currentMonth,
          year: currentYear,
          value: 500,
        },
        {
          id: 3,
          account_id: mockAccounts[1].id,
          month: currentMonth - 1 || 12,
          year: currentMonth - 1 === 0 ? currentYear - 1 : currentYear,
          value: 800,
        },
      ],
    });
    const { container } = customRender(<AccountsContainer />);
    expect(container).toMatchSnapshot();
  });

  test("should call supabase functions to add an account", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts: mockAccounts });
    const { getAllByText } = customRender(<AccountsContainer />);
    const addAccountModalBtn = getAllByText("addAccount")[0];
    expect(addAccountModalBtn).toBeDefined();
    fireEvent.click(addAccountModalBtn);
    await waitFor(() => {
      expect(getAllByText("addAccount")[0]).toBeDefined();
    });
  });
});
