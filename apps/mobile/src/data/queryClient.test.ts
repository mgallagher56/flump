import { BackendError } from "@flump/api-client";
import type { QueryClient } from "@tanstack/react-query";
import { createQueryClient, retryDelay, shouldRetry } from "./queryClient";

describe("shouldRetry", () => {
  it.each(["unavailable", "server"] as const)("retries %s twice, not a third time", (kind) => {
    const error = new BackendError(kind, "/accounts");
    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(1, error)).toBe(true);
    expect(shouldRetry(2, error)).toBe(false);
  });

  it.each([
    "unauthorised",
    "forbidden",
    "not-invited",
    "not-found",
    "client",
    "bad-response",
  ] as const)("never retries %s", (kind) => {
    expect(shouldRetry(0, new BackendError(kind, "/accounts"))).toBe(false);
  });

  it("never retries an error that is not from the backend", () => {
    expect(shouldRetry(0, new Error("x"))).toBe(false);
  });

  it("waits 1 s then 2 s", () => {
    expect(retryDelay(0)).toBe(1000);
    expect(retryDelay(1)).toBe(2000);
    expect(retryDelay(5)).toBe(4000);
  });
});

describe("a read answering 410 account_deleted", () => {
  // Cleared after each test, so no cache timer keeps Jest running.
  const clients: QueryClient[] = [];
  afterEach(() => {
    for (const client of clients.splice(0)) client.clear();
  });

  function failingRead(error: Error) {
    const onAccountDeleted = jest.fn();
    const client = createQueryClient({ onAccountDeleted });
    clients.push(client);
    const read = client
      .fetchQuery({
        queryKey: ["accounts"],
        queryFn: () => Promise.reject(error),
        retry: false,
      })
      .catch(() => undefined);
    return { onAccountDeleted, read };
  }

  function backendError(status: number, code?: string) {
    const error = new BackendError("client", "/accounts", status);
    if (code) error.code = code;
    return error;
  }

  it("tells the session once, so the last step of the deletion shows", async () => {
    const { onAccountDeleted, read } = failingRead(backendError(410, "account_deleted"));
    await read;
    expect(onAccountDeleted).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a 410 with another code", backendError(410, "gone")],
    ["a 410 with no code", backendError(410)],
    ["another status with that code", backendError(403, "account_deleted")],
    ["an error not from the backend", new Error("account_deleted")],
  ])("%s does not", async (_name, error) => {
    const { onAccountDeleted, read } = failingRead(error);
    await read;
    expect(onAccountDeleted).not.toHaveBeenCalled();
  });

  it("a client made without the handler still fails the read quietly", async () => {
    const client = createQueryClient();
    clients.push(client);
    await expect(
      client.fetchQuery({
        queryKey: ["x"],
        queryFn: () => Promise.reject(backendError(410, "account_deleted")),
        retry: false,
      }),
    ).rejects.toBeInstanceOf(BackendError);
  });
});
