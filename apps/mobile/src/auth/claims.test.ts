import { readClaims, readSessionId } from "./claims";

const encode = (value: unknown) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
// A token shape built at runtime; the signature part is never checked here.
const jwt = (payload: unknown) => `${encode({ alg: "RS256" })}.${encode(payload)}.sig`;

describe("claims", () => {
  it("reads the payload, including non-ASCII text", () => {
    expect(readClaims(jwt({ sid: "session_1", name: "Zoë", exp: 10 }))).toEqual({
      sid: "session_1",
      name: "Zoë",
      exp: 10,
    });
  });

  it.each([
    ["two parts", "a.b"],
    ["a payload that is not base64url", "a.%%%.c"],
    ["a payload that is not JSON", `a.${Buffer.from("nope").toString("base64url")}.c`],
    ["a JSON array", `a.${encode([1])}.c`],
  ])("returns undefined for %s", (_name, token) => {
    expect(readClaims(token)).toBeUndefined();
  });

  it("finds the session id, and nothing when it is missing or not text", () => {
    expect(readSessionId(jwt({ sid: "session_9" }))).toBe("session_9");
    expect(readSessionId(jwt({ sid: 9 }))).toBeUndefined();
    expect(readSessionId(jwt({}))).toBeUndefined();
    expect(readSessionId(null)).toBeUndefined();
  });
});
