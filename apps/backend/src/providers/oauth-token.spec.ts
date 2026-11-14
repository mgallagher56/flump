import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBank, json } from "./__fixtures__/fake-bank";
import { requestOAuthToken } from "./oauth-token";

const ctx = { provider: "testbank", operation: "exchange code" };

function stubToken(body: unknown) {
  const bank = createFakeBank([
    { key: "token", method: "POST", path: /\/token$/, respond: json(body) },
  ]);
  vi.stubGlobal("fetch", bank.fetch);
  return bank;
}

describe("requestOAuthToken", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("accepts camelCase fields and a numeric-string expiry", async () => {
    stubToken({ accessToken: "at", refreshToken: "rt", expiresIn: "3600" });
    await expect(requestOAuthToken("https://bank/token", { a: "b" }, ctx)).resolves.toEqual({
      accessToken: "at",
      refreshToken: "rt",
      expiresIn: 3600,
    });
  });

  it("drops an unreadable expiry and an empty refresh token", async () => {
    stubToken({ access_token: "at", refresh_token: "", expires_in: "soon" });
    await expect(requestOAuthToken("https://bank/token", {}, ctx)).resolves.toEqual({
      accessToken: "at",
      refreshToken: undefined,
      expiresIn: undefined,
    });
  });

  it("posts the form urlencoded", async () => {
    const bank = stubToken({ access_token: "at" });
    await requestOAuthToken("https://bank/token", { grant_type: "refresh_token", x: "a b" }, ctx);
    expect(bank.callsTo("token")[0]?.body).toBe("grant_type=refresh_token&x=a+b");
    expect(bank.callsTo("token")[0]?.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );
  });
});
