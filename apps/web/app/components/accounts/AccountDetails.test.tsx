import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { emptyObject } from "~/utils/utils";
import AccountDetails from "./AccountDetails";

const mocks = vi.hoisted(() => ({
  mockFetcherSubmit: vi.fn(),
  fetcherData: { current: null as unknown },
  mockAccountDetails: [
    {
      month: 1,
      year: 2021,
      value: 1000,
    },
    {
      month: 2,
      year: 2021,
      value: 1000,
    },
    {
      month: 3,
      year: 2021,
      value: 1000,
    },
    {
      month: 4,
      year: 2021,
      value: 1000,
    },
    {
      month: 5,
      year: 2021,
      value: 1000,
    },
    {
      month: 6,
      year: 2021,
      value: 1000,
    },
    {
      month: 7,
      year: 2021,
      value: 1000,
    },
    {
      month: 8,
      year: 2021,
      value: 1000,
    },
    {
      month: 9,
      year: 2021,
      value: 1000,
    },
    {
      month: 10,
      year: 2021,
      value: 1000,
    },
    {
      month: 11,
      year: 2021,
      value: 1000,
    },
    {
      month: 12,
      year: 2021,
      value: 1000,
    },
    {
      month: 1,
      year: 2023,
      value: 1000,
    },
    {
      month: 2,
      year: 2023,
      value: 1000,
    },
    {
      month: 3,
      year: 2023,
      value: 1000,
    },
    {
      month: 4,
      year: 2023,
      value: 1000,
    },
    {
      month: 5,
      year: 2023,
      value: 1000,
    },
    {
      month: 6,
      year: 2023,
      value: 1000,
    },
    {
      month: 7,
      year: 2023,
      value: 1000,
    },
    {
      month: 8,
      year: 2023,
      value: 1000,
    },
    {
      month: 9,
      year: 2023,
      value: 1000,
    },
    {
      month: 10,
      year: 2023,
      value: 1000,
    },
    {
      month: 11,
      year: 2023,
      value: 1000,
    },
    {
      month: 12,
      year: 2023,
      value: 1000,
    },
  ],
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => ({
      accountDetails: mocks.mockAccountDetails,
      account: { id: "123456", name: "Monzo Current" },
    }),
    useRevalidator: () => ({ revalidate: vi.fn() }),
    useFetcher: () => ({
      submit: mocks.mockFetcherSubmit,
      state: "idle",
      data: mocks.fetcherData.current,
      Form: "form",
    }),
  };
});

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${val?.toLocaleString()}`,
  }),
}));

describe("<AccountDetails />", () => {
  test("should render", () => {
    const { container } = customRender(
      <AccountDetails editedValues={emptyObject} isEditMode={false} onInputChange={vi.fn()} />,
    );
    expect(container).toMatchSnapshot();
  });

  test("should render in edit mode", () => {
    const { container } = customRender(
      <AccountDetails
        editedValues={{
          2023: {
            1: "1000",
          },
        }}
        isEditMode={true}
        onInputChange={vi.fn()}
      />,
    );
    expect(container).toMatchSnapshot();
  });

  test("opens a confirm dialog for deleting a year without submitting or using window.confirm", () => {
    const confirmSpy = vi.fn();
    window.confirm = confirmSpy;
    mocks.mockFetcherSubmit.mockClear();
    const { getByTitle, getByRole } = customRender(
      <AccountDetails editedValues={emptyObject} isEditMode={false} onInputChange={vi.fn()} />,
    );
    fireEvent.click(getByTitle("Delete 2023"));
    expect(getByRole("alertdialog", { name: "Delete 2023?" })).toBeDefined();
    expect(getByRole("alertdialog").textContent).toContain(
      "This removes all monthly balances for 2023 from Monzo Current. This can't be undone.",
    );
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  test("cancelling the year confirm submits nothing", () => {
    mocks.mockFetcherSubmit.mockClear();
    const { getByTitle, getByRole, queryByRole } = customRender(
      <AccountDetails editedValues={emptyObject} isEditMode={false} onInputChange={vi.fn()} />,
    );
    fireEvent.click(getByTitle("Delete 2023"));
    fireEvent.click(getByRole("button", { name: "Cancel" }));
    expect(queryByRole("alertdialog")).toBeNull();
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();
  });

  test("should remove year when the delete year confirmation is accepted", () => {
    mocks.mockFetcherSubmit.mockClear();
    const { getByTitle, getByRole } = customRender(
      <AccountDetails editedValues={emptyObject} isEditMode={false} onInputChange={vi.fn()} />,
    );
    fireEvent.click(getByTitle("Delete 2023"));
    fireEvent.click(getByRole("button", { name: "Delete year" }));
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledTimes(1);
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      {
        intent: "deleteYear",
        year: "2023",
      },
      { method: "POST" },
    );
  });

  test("a failed year delete shows the error inline and keeps the dialog open; success closes it", () => {
    mocks.mockFetcherSubmit.mockClear();
    mocks.fetcherData.current = null;
    const ui = () => (
      <AccountDetails editedValues={emptyObject} isEditMode={false} onInputChange={vi.fn()} />
    );
    const { getByTitle, getByRole, queryByRole, rerender } = customRender(ui());
    fireEvent.click(getByTitle("Delete 2023"));
    fireEvent.click(getByRole("button", { name: "Delete year" }));

    mocks.fetcherData.current = {
      success: false,
      error: "We couldn't reach the server. Please try again.",
    };
    rerender(ui());
    expect(getByRole("alert").textContent).toBe("We couldn't reach the server. Please try again.");
    expect(getByRole("alertdialog")).toBeDefined();

    fireEvent.click(getByRole("button", { name: "Delete year" }));
    mocks.fetcherData.current = { success: true };
    rerender(ui());
    expect(queryByRole("alertdialog")).toBeNull();
    mocks.fetcherData.current = null;
  });
});
