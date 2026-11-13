import { describe, expect, it, vi } from "vitest";

vi.mock("@workos-inc/authkit-react-router", () => ({
  configure: vi.fn(),
  getSignUpUrl: vi.fn(async () => ({ url: "https://authkit.example/sign-up", headers: {} })),
}));

import { loader } from "./signup._index";

const call = (path: string) =>
  loader({ request: new Request(`https://app.example${path}`), params: {}, context: {} } as never);

describe("signup route", () => {
  it("redirects the legacy /signUp casing to /signup with a 301", async () => {
    const response = (await call("/signUp?ref=x")) as Response;
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("/signup?ref=x");
  });

  it.each([
    ["/signup/", "/signup"],
    ["/SIGNUP", "/signup"],
    ["/signUp?plan=pro&ref=x", "/signup?plan=pro&ref=x"],
  ])("redirects %s to %s with a 301", async (path, expected) => {
    const response = (await call(path)) as Response;
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe(expected);
  });

  it("sends the canonical /signup to AuthKit", async () => {
    const response = (await call("/signup")) as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://authkit.example/sign-up");
  });
});
