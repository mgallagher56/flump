import { randomUUID } from "node:crypto";
import { renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { ApiProvider } from "./ApiProvider";
import {
  deleteAccountById,
  patchAccount,
  postAccount,
  postMortgageWithProperty,
  useAccountWrites,
} from "./accountWrites";
import { fail, fakeApi, testQueryClient } from "./fakeApi";
import { queryKeys } from "./queryKeys";

const saved = (id: string, extra: Record<string, unknown> = {}) => ({ id, ...extra });

describe("account writes", () => {
  it("adds an account with POST /accounts, the body as given and the form's key", async () => {
    const id = randomUUID();
    const api = fakeApi({ "POST /accounts": () => saved(id, { someNewField: 1 }) });
    await postAccount(api.client, { name: "Holiday", type: "Saving", balance: 250 }, "key-1");
    expect(api.calls).toEqual([
      {
        method: "POST",
        path: "/accounts",
        body: { name: "Holiday", type: "Saving", balance: 250 },
        idempotencyKey: "key-1",
      },
    ]);
  });

  it("refuses a body the contract refuses, before any request", async () => {
    const api = fakeApi({});
    // A blank name: the contract's Name trims and needs one character.
    await expect(
      postAccount(api.client, { name: "  ", type: "Saving", balance: 1 }, "key"),
    ).rejects.toThrow();
    // A share of 0: the contract's SharePercent is 1 to 100.
    await expect(
      patchAccount(api.client, randomUUID(), { sharePercent: 0 }, null),
    ).rejects.toThrow();
    expect(api.request).not.toHaveBeenCalled();
  });

  it("adds a mortgage with its property in one call", async () => {
    const api = fakeApi({
      "POST /accounts/mortgage-with-property": () => ({
        mortgage: saved(randomUUID()),
        property: saved(randomUUID()),
      }),
    });
    const body = {
      mortgage: { name: "Mortgage", balance: -200000 },
      property: { balance: 300000 },
    };
    await postMortgageWithProperty(api.client, body, "key-2");
    expect(api.calls).toEqual([
      { method: "POST", path: "/accounts/mortgage-with-property", body, idempotencyKey: "key-2" },
    ]);
  });

  it("changes an account with PATCH and If-Match for the version read", async () => {
    const id = randomUUID();
    const api = fakeApi({ [`PATCH /accounts/${id}`]: () => saved(id) });
    await patchAccount(api.client, id, { name: "Rainy day" }, "2026-11-20T10:00:00.000Z");
    expect(api.calls).toEqual([
      {
        method: "PATCH",
        path: `/accounts/${id}`,
        body: { name: "Rainy day" },
        ifMatch: '"2026-11-20T10:00:00.000Z"',
      },
    ]);
  });

  it("sends no If-Match when the version is missing or not a date", async () => {
    const id = randomUUID();
    const api = fakeApi({ [`PATCH /accounts/${id}`]: () => saved(id) });
    await patchAccount(api.client, id, { name: "A" }, undefined);
    await patchAccount(api.client, id, { name: "B" }, "not a date");
    expect(api.calls.map((c) => c.ifMatch)).toEqual([undefined, undefined]);
  });

  it("deletes with DELETE /accounts/:id", async () => {
    const id = randomUUID();
    const api = fakeApi({ [`DELETE /accounts/${id}`]: () => ({ success: true }) });
    await deleteAccountById(api.client, id);
    expect(api.calls).toEqual([{ method: "DELETE", path: `/accounts/${id}`, body: undefined }]);
  });
});

describe("useAccountWrites", () => {
  function setUp(routes: Parameters<typeof fakeApi>[0]) {
    const api = fakeApi(routes);
    const queryClient = testQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ApiProvider client={api.client} queryClient={queryClient}>
        {children}
      </ApiProvider>
    );
    return { api, queryClient, wrapper };
  }

  it("a save that lands reads the accounts, their months and the check-ins again", async () => {
    const id = randomUUID();
    const { queryClient, wrapper } = setUp({ [`PATCH /accounts/${id}`]: () => saved(id) });
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useAccountWrites(), { wrapper });
    await expect(result.current.update(id, { name: "New" }, null)).resolves.toEqual({
      status: "saved",
    });
    expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual([
      queryKeys.accounts(),
      queryKeys.accountDetails(),
      queryKeys.checkIns(),
    ]);
  });

  it("a 412 is a conflict, and the accounts are read again", async () => {
    const id = randomUUID();
    const { queryClient, wrapper } = setUp({
      [`PATCH /accounts/${id}`]: () => fail("client", 412),
    });
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useAccountWrites(), { wrapper });
    await expect(result.current.update(id, { name: "New" }, null)).resolves.toEqual({
      status: "conflict",
    });
    expect(invalidate).toHaveBeenCalledTimes(3);
  });

  it("any other failure says its kind and reads nothing again", async () => {
    const id = randomUUID();
    const { queryClient, wrapper } = setUp({
      [`DELETE /accounts/${id}`]: () => fail("rate-limited", 429),
    });
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useAccountWrites(), { wrapper });
    await expect(result.current.remove(id)).resolves.toEqual({
      status: "failed",
      kind: "rate-limited",
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("a body the contract refuses is invalid, and nothing is sent", async () => {
    const { api, wrapper } = setUp({});
    const { result } = await renderHook(() => useAccountWrites(), { wrapper });
    await expect(
      result.current.create({ name: "", type: "Saving", balance: 0 }, "k"),
    ).resolves.toEqual({
      status: "invalid",
    });
    expect(api.request).not.toHaveBeenCalled();
  });
});

describe("useAccountWrites create", () => {
  it("an add that lands says the new account's id", async () => {
    const id = randomUUID();
    const api = fakeApi({ "POST /accounts": () => ({ id }) });
    const queryClient = testQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ApiProvider client={api.client} queryClient={queryClient}>
        {children}
      </ApiProvider>
    );
    const { result } = await renderHook(() => useAccountWrites(), { wrapper });
    await expect(
      result.current.create({ name: "Home", type: "Property", balance: 300000 }, "k"),
    ).resolves.toEqual({ status: "saved", id });
  });
});

describe("useAccountWrites remove (S8 device check)", () => {
  it("a delete that lands takes the account and its months out of the cache at once", async () => {
    const gone = randomUUID();
    const kept = randomUUID();
    const api = fakeApi({
      [`DELETE /accounts/${gone}`]: () => ({ success: true }),
      // The list read again never answers: the cache must not wait for it.
      "GET /accounts": () => new Promise(() => {}),
      "GET /account-details": () => new Promise(() => {}),
      "GET /snapshots/check-ins": () => new Promise(() => {}),
    });
    const queryClient = testQueryClient();
    queryClient.setQueryData(queryKeys.accounts(), [{ id: gone }, { id: kept }]);
    queryClient.setQueryData(queryKeys.accountDetails(), [
      { accountId: gone, year: 2026, month: 10, value: 1 },
      { accountId: kept, year: 2026, month: 10, value: 2 },
    ]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ApiProvider client={api.client} queryClient={queryClient}>
        {children}
      </ApiProvider>
    );
    const { result } = await renderHook(() => useAccountWrites(), { wrapper });
    await expect(result.current.remove(gone)).resolves.toEqual({ status: "saved" });
    expect(queryClient.getQueryData(queryKeys.accounts())).toEqual([{ id: kept }]);
    expect(queryClient.getQueryData(queryKeys.accountDetails())).toEqual([
      { accountId: kept, year: 2026, month: 10, value: 2 },
    ]);
  });

  it("a delete that fails leaves the cache as it was", async () => {
    const id = randomUUID();
    const api = fakeApi({ [`DELETE /accounts/${id}`]: () => fail("server", 500) });
    const queryClient = testQueryClient();
    queryClient.setQueryData(queryKeys.accounts(), [{ id }]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ApiProvider client={api.client} queryClient={queryClient}>
        {children}
      </ApiProvider>
    );
    const { result } = await renderHook(() => useAccountWrites(), { wrapper });
    await expect(result.current.remove(id)).resolves.toEqual({ status: "failed", kind: "server" });
    expect(queryClient.getQueryData(queryKeys.accounts())).toEqual([{ id }]);
  });
});
