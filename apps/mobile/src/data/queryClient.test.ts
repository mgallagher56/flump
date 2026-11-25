import { BackendError } from "@flump/api-client";
import { retryDelay, shouldRetry } from "./queryClient";

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
