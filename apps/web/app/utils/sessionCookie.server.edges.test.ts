// @vitest-environment node
import { randomBytes } from "node:crypto";
import { createCookieSessionStorage } from "react-router";
import { describe, expect, it, vi } from "vitest";

// The global test setup stubs react-router; this needs the real cookie session storage.
vi.mock("react-router", async () => await vi.importActual("react-router"));

import { hasSealedSession } from "./sessionCookie.server";

// Built at runtime so no secret-looking literal is committed.
const secret = randomBytes(16).toString("hex");

const legacyCookieWithJwt = async () => {
  const storage = createCookieSessionStorage({
    cookie: { name: "wos-session", secrets: [secret] },
  });
  const session = await storage.getSession();
  session.set("jwt", "sealed-blob");
  return (await storage.commitSession(session)).split(";")[0];
};

const req = (cookie: string) =>
  new Request("https://web.example.test/logout", { method: "POST", headers: { Cookie: cookie } });

describe("hasSealedSession cookie name fallback", () => {
  it("reads the wos-session cookie when no cookie name is configured", async () => {
    const cookie = await legacyCookieWithJwt();
    expect(await hasSealedSession(req(cookie), { WORKOS_COOKIE_PASSWORD: secret })).toBe(true);
  });

  it("reads the wos-session cookie when the configured name is only spaces", async () => {
    const cookie = await legacyCookieWithJwt();
    const env = { WORKOS_COOKIE_PASSWORD: secret, WORKOS_COOKIE_NAME: "   " };
    expect(await hasSealedSession(req(cookie), env)).toBe(true);
  });
});
