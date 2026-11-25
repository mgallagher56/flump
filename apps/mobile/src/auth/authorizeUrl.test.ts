import { buildAuthorizeUrl, buildLogoutUrl, parseCallback, readQuery } from "./authorizeUrl";

const config = {
  authBaseUrl: "https://auth.test.invalid",
  clientId: "client_TESTONLY",
  redirectUri: "flump://auth/callback",
};

describe("buildAuthorizeUrl", () => {
  it("asks AuthKit for a code with an S256 challenge and the state", () => {
    const url = buildAuthorizeUrl(config, { challenge: "c".repeat(43), state: "s1" }, "sign-in");
    const [base, query] = url.split("?");
    expect(base).toBe("https://auth.test.invalid/user_management/authorize");
    expect(readQuery(query ?? "")).toEqual({
      client_id: "client_TESTONLY",
      redirect_uri: "flump://auth/callback",
      response_type: "code",
      code_challenge: "c".repeat(43),
      code_challenge_method: "S256",
      state: "s1",
      provider: "authkit",
    });
  });

  it("opens the sign-up page for Create account", () => {
    const url = buildAuthorizeUrl(config, { challenge: "c".repeat(43), state: "s1" }, "sign-up");
    expect(readQuery(url.split("?")[1] ?? "").screen_hint).toBe("sign-up");
  });
});

describe("buildLogoutUrl", () => {
  it("ends the WorkOS session and comes back to the app", () => {
    const url = buildLogoutUrl(config, "session_1");
    expect(url.split("?")[0]).toBe("https://auth.test.invalid/user_management/sessions/logout");
    expect(readQuery(url.split("?")[1] ?? "")).toEqual({
      session_id: "session_1",
      return_to: "flump://auth/callback",
    });
  });
});

describe("parseCallback", () => {
  const back = (query: string) => `flump://auth/callback?${query}`;

  it("returns the code when the state matches", () => {
    expect(parseCallback(back("code=abc&state=s1"), config.redirectUri, "s1")).toEqual({
      kind: "code",
      code: "abc",
    });
  });

  it.each([
    ["a different state", "code=abc&state=s2"],
    ["no state", "code=abc"],
    ["an empty state", "code=abc&state="],
  ])("refuses %s before any exchange", (_name, query) => {
    expect(parseCallback(back(query), config.redirectUri, "s1")).toEqual({
      kind: "state-mismatch",
    });
  });

  it("refuses a mismatched state even when it carries an error", () => {
    expect(parseCallback(back("error=access_denied&state=x"), config.redirectUri, "s1")).toEqual({
      kind: "state-mismatch",
    });
  });

  it("reads access_denied as denied", () => {
    expect(parseCallback(back("error=access_denied&state=s1"), config.redirectUri, "s1")).toEqual({
      kind: "denied",
    });
  });

  it.each(["error=server_error&state=s1", "state=s1", "code=&state=s1"])(
    "reads anything else as failed (%s)",
    (query) => {
      expect(parseCallback(back(query), config.redirectUri, "s1")).toEqual({ kind: "failed" });
    },
  );

  it("refuses an address that is not the registered redirect", () => {
    expect(parseCallback("flump://elsewhere?code=abc&state=s1", config.redirectUri, "s1")).toEqual({
      kind: "failed",
    });
  });

  it("decodes percent-encoded values and ignores a fragment", () => {
    expect(parseCallback(back("code=a%2Bb&state=s%201#frag"), config.redirectUri, "s 1")).toEqual({
      kind: "code",
      code: "a+b",
    });
  });
});
