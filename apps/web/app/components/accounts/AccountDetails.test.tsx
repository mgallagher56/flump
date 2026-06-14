import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { emptyObject } from "~/utils/utils";
import AccountDetails from "./AccountDetails";

const mocks = vi.hoisted(() => ({
  mockFetcherSubmit: vi.fn(),
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
    useLoaderData: () => ({ accountDetails: mocks.mockAccountDetails, account: { id: "123456" } }),
    useRevalidator: () => ({ revalidate: vi.fn() }),
    useFetcher: () => ({
      submit: mocks.mockFetcherSubmit,
      state: "idle",
      data: null,
      Form: "form",
    }),
  };
});

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

  test("should remove year when delete button is clicked", () => {
    const { container, getAllByText } = customRender(
      <AccountDetails editedValues={emptyObject} isEditMode={false} onInputChange={vi.fn()} />,
    );
    const deleteBtn = getAllByText("deleteYear")[0];
    fireEvent.click(deleteBtn);
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      {
        intent: "deleteYear",
        year: "2021",
      },
      { method: "POST" },
    );
    expect(container).toMatchSnapshot();
  });
});
