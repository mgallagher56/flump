import { act, renderHook } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";
import { fakeApi, withApi } from "../../data/fakeApi";
import { type FormAccount, useAccountForm } from "./useAccountForm";

function wrapper() {
  const api = fakeApi({});
  return ({ children }: { children: ReactNode }) =>
    withApi(children as ReactElement, api.client).ui;
}

describe("useAccountForm balanceTextRef", () => {
  it("keeps balanceTextRef in step when balance is cleared via set() before a type change", async () => {
    const { result } = await renderHook(
      () =>
        useAccountForm({
          mode: { kind: "add" },
          accounts: [],
          partnerMode: false,
          onSaved: jest.fn(),
          onDeleted: jest.fn(),
        }),
      { wrapper: wrapper() },
    );

    await act(async () => result.current.setFigure("balance", 50, "50"));
    expect(result.current.form.balance).toBe("50");

    await act(async () => result.current.set("balance", ""));
    expect(result.current.form.balance).toBe("");

    await act(async () => result.current.setType("Saving"));
    expect(result.current.form.balance).toBe("");
  });

  it("initialises balanceTextRef from the loaded account on the edit-load path", async () => {
    const account: FormAccount = {
      id: "acc-1",
      name: "Overdrawn current",
      type: "Current",
      balance: -50,
    };
    const { result } = await renderHook(
      () =>
        useAccountForm({
          mode: { kind: "edit", account },
          accounts: [account],
          partnerMode: false,
          onSaved: jest.fn(),
          onDeleted: jest.fn(),
        }),
      { wrapper: wrapper() },
    );

    expect(result.current.form.balance).toBe("-50");

    await act(async () => result.current.setType("Credit Card"));
    expect(result.current.form.balance).toBe("-50");

    await act(async () => result.current.setType("Current"));
    expect(result.current.form.balance).toBe("-50");

    await act(async () => result.current.set("balance", ""));
    await act(async () => result.current.setType("Saving"));
    expect(result.current.form.balance).toBe("");
  });
});
