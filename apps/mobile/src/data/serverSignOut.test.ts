import { createServerSignOut } from "./serverSignOut";

const API = "https://api.example.test";
// Built at runtime: a sample, never a real token.
const token = ["sample", "access", String(Date.now())].join(".");

function fetchAnswering(status: number, body?: unknown) {
  return jest.fn(
    async () =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: body === undefined ? {} : { "content-type": "application/json" },
      }),
  );
}

const callOf = (fn: jest.Mock) => {
  const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
};

afterEach(() => jest.restoreAllMocks());

describe("createServerSignOut", () => {
  it("posts to /v1/session/sign-out with exactly the given token, and a 204 is ended", async () => {
    const fetchImpl = fetchAnswering(204);
    expect(await createServerSignOut(API, fetchImpl)(token)).toBe("ended");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const { url, init, headers } = callOf(fetchImpl);
    expect(url).toBe(`${API}/v1/session/sign-out`);
    expect(init.method).toBe("POST");
    expect(headers.get("authorization")).toBe(`Bearer ${token}`);
  });

  it("works where crypto.randomUUID does not exist, as on Hermes, and sends no Idempotency-Key", async () => {
    // Every app test runs as Hermes does, with no global crypto.randomUUID (src/testing/jestSetup.ts).
    expect(globalThis.crypto?.randomUUID).toBeUndefined();
    const fetchImpl = fetchAnswering(204);
    expect(await createServerSignOut(API, fetchImpl)(token)).toBe("ended");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(callOf(fetchImpl).headers.get("idempotency-key")).toBeNull();
  });

  it("a 401 is unauthorised, with no refresh and no second call", async () => {
    const fetchImpl = fetchAnswering(401, {
      code: "unauthorized",
      message: "Sign in to continue.",
      requestId: "r1",
    });
    expect(await createServerSignOut(API, fetchImpl)(token)).toBe("unauthorised");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("a 503 is unavailable", async () => {
    const fetchImpl = fetchAnswering(503, {
      code: "service_unavailable",
      message: "Not now.",
      requestId: "r2",
    });
    expect(await createServerSignOut(API, fetchImpl)(token)).toBe("unavailable");
  });

  it("no network is unavailable, never a throw", async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError("Network request failed");
    });
    expect(await createServerSignOut(API, fetchImpl)(token)).toBe("unavailable");
  });
});
