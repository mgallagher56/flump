import { cleanup } from "@testing-library/react";
import mockUser from "__mocks__/user";
import type { ReactNode } from "react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import AddEditAccountsDialogBtn from "./AddEditAccountsDialog";

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({ revalidate: vi.fn() })),
  mockFetcherSubmit: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: mocks.mockUseRevalidator,
    useFetcher: () => ({
      submit: mocks.mockFetcherSubmit,
      state: "idle",
      data: null,
      Form: "form",
    }),
    Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
    useSubmit: () => ({ onSubmit: vi.fn() }),
  };
});

describe("<EditAccountDialogBtn", () => {
  beforeAll(() => {
    cleanup();
  });
  test("should render edit account dialog when trigger button is clicked", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { baseElement, getByText, getAllByText, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="123456" />,
    );

    const triggerBtn = getByText("edit");
    expect(triggerBtn).toBeDefined();
    await user.click(triggerBtn);

    const saveBtn = getAllByText("save")[0];
    await user.click(saveBtn);
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "update",
        accountId: "123456",
      }),
      expect.anything(),
    );

    const htmlString = baseElement.outerHTML.toString();
    const baseElementConstant = htmlString.replaceAll(/style="[^"]*"/g, "");
    expect(baseElementConstant).toMatchSnapshot();
  });

  test("should render edit account dialog and call fetcher.submit when delete button is clicked", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { baseElement, getByText, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="123456" />,
    );

    const triggerBtn = getByText("edit");
    expect(triggerBtn).toBeDefined();
    await user.click(triggerBtn);

    expect(baseElement).toMatchSnapshot();

    const deleteBtn = getByText("delete");
    expect(deleteBtn).toBeDefined();
    await user.click(deleteBtn);

    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "delete",
        accountId: "123456",
      }),
      expect.anything(),
    );
  });
});
