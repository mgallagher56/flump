import { redirectSystemPath } from "./nativeIntent";

describe("redirectSystemPath", () => {
  it.each([
    "flump://auth/callback?code=abc&state=xyz",
    "flump:///auth/callback?code=abc",
    "/auth/callback?code=abc",
    "auth/callback",
  ])("ignores the sign-in redirect %s while the app is open", (path) => {
    expect(redirectSystemPath({ path, initial: false })).toBeNull();
  });

  it("opens the callback route on a cold start, which goes home", () => {
    const path = "flump://auth/callback?code=abc";
    expect(redirectSystemPath({ path, initial: true })).toBe(path);
  });

  it.each(["flump://page/pension", "flump://accounts", "/more", "flump://auth/callbacks"])(
    "leaves every other link alone: %s",
    (path) => {
      expect(redirectSystemPath({ path, initial: false })).toBe(path);
    },
  );
});
