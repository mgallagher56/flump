import { fireEvent, screen } from "@testing-library/react";
import mockUser from "__mocks__/user";
import { vi } from "vitest";
import { AccountTypeEnum } from "~/containers/accounts/utils";
import customRender from "~/testUtils/customRender";
import { currentMonth, currentYear } from "~/utils/utils";

import AccountsCard from "./AccountsCard";

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({ revalidate: vi.fn() })),
  navigateSpy: vi.fn(),
  mockUseNavigate: () => mocks.navigateSpy,
  mockFrom: vi.fn(() => ({
    delete: () => ({
      eq: () => ({
        eq: () => ({}),
      }),
    }),
  })),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: mocks.mockUseRevalidator,
    useNavigate: mocks.mockUseNavigate,
    useFetcher: () => ({
      submit: vi.fn(),
      state: "idle",
      data: null,
      Form: "form",
    }),
  };
});

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${val?.toLocaleString()}`,
  }),
}));

vi.mock("~/utils/utils", async () => {
  const actual: any = await vi.importActual("~/utils/utils");
  return {
    ...actual,
    currentMonth: 12,
    currentYear: 2023,
  };
});

vi.mock("app/utils/utils", () => ({
  currentMonth: 12,
  currentYear: 2023,
}));

const getAdjustedValue = (index: number) => {
  if (currentMonth - 1 === index) return `${index - 2}000`;
  if (currentMonth - 3 === index) return `${index + 5}000`;

  return `${index}000`;
};

describe("<AccountsCard />", () => {
  test("it renders an AccountsCard component with title as expected", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      user: mockUser,
      accountDetails: Array.from({ length: 12 }, (_, i) => {
        return {
          id: i,
          account_id: "123456",
          month: i + 1,
          year: currentYear,
          value: parseInt(`${i + 1}000}`, 10),
        };
      }),
    });

    const { baseElement } = customRender(
      <AccountsCard accountId={"123456"} name="My curent account" type={AccountTypeEnum.CURRENT} />,
    );
    expect(baseElement).toMatchSnapshot();
  });
});

describe("<AccountsCard with increasing values", () => {
  test("should match snapshot for account with increasing values", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      user: mockUser,
      accountDetails: Array.from({ length: 13 }, (_, i) => {
        return {
          id: i,
          account_id: "123456",
          month: i + 1,
          year: currentYear,
          value: parseInt(getAdjustedValue(i), 10),
        };
      }),
    });

    const { baseElement } = customRender(
      <AccountsCard accountId={"123456"} name="My curent account" type={AccountTypeEnum.CURRENT} />,
    );

    expect(baseElement).toMatchSnapshot();
  });

  test("should not display future months in the account details chart or balance calculation", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      user: mockUser,
      accountDetails: [
        { id: 1, account_id: "inv-1", month: 11, year: 2023, value: 13000 },
        { id: 2, account_id: "inv-1", month: 12, year: 2023, value: 13216 },
        { id: 3, account_id: "inv-1", month: 1, year: 2024, value: 0 },
      ],
    });

    const { getByText } = customRender(
      <AccountsCard accountId={"inv-1"} name="Trading 212" type={AccountTypeEnum.INVESTMENT} />,
    );

    expect(getByText("£13,216")).toBeDefined();
  });
});

describe("<AccountsCard /> liabilities", () => {
  test.each([AccountTypeEnum.CREDIT_CARD, AccountTypeEnum.LOAN, AccountTypeEnum.OVERDRAFT])(
    "shows a negative stored %s balance as a positive amount owed",
    (type) => {
      mocks.mockUseLoaderData.mockReturnValueOnce({ user: mockUser, accountDetails: [] });

      const { getByText, queryByText } = customRender(
        <AccountsCard accountId={"debt-1"} balance={-1200} name="Debt" type={type} />,
      );

      expect(getByText("£1,200")).toBeDefined();
      expect(queryByText("£-1,200")).toBeNull();
    },
  );

  test("shows a negative latest history value as a positive amount owed", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      user: mockUser,
      accountDetails: [
        { id: 1, account_id: "debt-2", month: 10, year: 2023, value: -1500 },
        { id: 2, account_id: "debt-2", month: 11, year: 2023, value: -1200 },
      ],
    });

    const { getByText, queryByText } = customRender(
      <AccountsCard accountId={"debt-2"} name="Card" type={AccountTypeEnum.CREDIT_CARD} />,
    );

    expect(getByText("£1,200")).toBeDefined();
    expect(queryByText("£-1,200")).toBeNull();
  });
});

describe("<AccountsCard /> interactions", () => {
  const renderCard = () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, accountDetails: [] });
    mocks.navigateSpy.mockClear();
    return customRender(
      <AccountsCard
        accountId={"123456"}
        name="My current account"
        type={AccountTypeEnum.CURRENT}
      />,
    );
  };

  test("clicking the card navigates to the account", () => {
    renderCard();
    fireEvent.click(screen.getByText("My current account"));
    expect(mocks.navigateSpy).toHaveBeenCalledWith("/app/accounts/123456");
  });

  test("the edit button does not navigate and its dialog clicks do not bubble to the card", () => {
    renderCard();
    const buttons = screen.getAllByRole("button");
    const editBtn = buttons.find((b) => b.tagName === "BUTTON") as HTMLElement;
    fireEvent.click(editBtn);
    fireEvent.keyDown(editBtn, { key: "Enter" });
    expect(mocks.navigateSpy).not.toHaveBeenCalled();
  });
});
