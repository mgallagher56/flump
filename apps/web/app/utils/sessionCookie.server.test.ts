// @vitest-environment node
import { randomBytes } from "node:crypto";
import { createCookieSessionStorage } from "react-router";
import { describe, expect, it, vi } from "vitest";

// The global test setup stubs react-router; this needs the real cookie session storage.
vi.mock("react-router", async () => await vi.importActual("react-router"));

import { hasSealedSession } from "./sessionCookie.server";

// Built at runtime so no secret-looking literal is committed.
const secret = randomBytes(16).toString("hex");
const env = { WORKOS_COOKIE_PASSWORD: secret, WORKOS_COOKIE_NAME: "wos-session" };

const cookieFor = async (data: Record<string, string>, name = "wos-session", key = secret) => {
  const storage = createCookieSessionStorage({ cookie: { name, secrets: [key] } });
  const session = await storage.getSession();
  for (const [k, v] of Object.entries(data)) session.set(k, v);
  return (await storage.commitSession(session)).split(";")[0];
};

const req = (cookie?: string) =>
  new Request("https://web.example.test/logout", {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : {},
  });

describe("hasSealedSession", () => {
  it("is false with no Cookie header", async () => {
    expect(await hasSealedSession(req(), env)).toBe(false);
  });

  it("is false for a session cookie without a jwt (the case signOut crashes on)", async () => {
    expect(await hasSealedSession(req(await cookieFor({ other: "x" })), env)).toBe(false);
  });

  it("is true for a session cookie holding a jwt, without needing it to be valid or fresh", async () => {
    expect(await hasSealedSession(req(await cookieFor({ jwt: "sealed-blob" })), env)).toBe(true);
  });

  it("is false for a cookie signed with another secret (tampered)", async () => {
    const forged = await cookieFor({ jwt: "x" }, "wos-session", randomBytes(16).toString("hex"));
    expect(await hasSealedSession(req(forged), env)).toBe(false);
  });

  it("follows the configured cookie name and ignores a differently named cookie", async () => {
    const prod = { ...env, WORKOS_COOKIE_NAME: "__Host-wos-session" };
    expect(
      await hasSealedSession(req(await cookieFor({ jwt: "x" }, "__Host-wos-session")), prod),
    ).toBe(true);
    expect(await hasSealedSession(req(await cookieFor({ jwt: "x" }, "wos-session")), prod)).toBe(
      false,
    );
  });

  it("is false when the cookie password is not configured", async () => {
    const cookie = await cookieFor({ jwt: "x" });
    expect(await hasSealedSession(req(cookie), { WORKOS_COOKIE_NAME: "wos-session" })).toBe(false);
  });
});
