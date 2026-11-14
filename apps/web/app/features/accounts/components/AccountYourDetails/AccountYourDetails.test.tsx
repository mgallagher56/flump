import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { AccountYourDetails } from "./AccountYourDetails";

vi.mock("react-router", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("react-router");
  return {
    ...actual,
    useLoaderData: () => ({ accounts: [{ id: "a1", name: "Monzo", type: "Current" }] }),
    useFetcher: () => ({ submit: vi.fn(), state: "idle", data: null, Form: "form" }),
  };
});

describe("<AccountYourDetails />", () => {
  test("shows the saved facts, the Saved state with the last-updated month and an Edit button", () => {
    const { getByRole, getByText } = customRender(
      <AccountYourDetails
        accountId="a1"
        balance={2450}
        lastUpdated="March 2026"
        name="Monzo"
        type="Current"
      />,
    );
    expect(getByRole("heading", { name: "Your account" })).toBeDefined();
    expect(getByText("Saved")).toBeDefined();
    expect(getByText("Last updated March 2026")).toBeDefined();
    expect(getByText("£2,450")).toBeDefined();
    expect(getByRole("button", { name: "edit" })).toBeDefined();
  });

  test("labels a liability as the amount owed and omits the date when unknown", () => {
    const { getByText, queryByText } = customRender(
      <AccountYourDetails
        accountId="a1"
        balance={1200}
        lastUpdated={null}
        name="Barclaycard"
        type="Credit Card"
      />,
    );
    expect(getByText("Amount owed")).toBeDefined();
    expect(queryByText(/Last updated/)).toBeNull();
  });
});
