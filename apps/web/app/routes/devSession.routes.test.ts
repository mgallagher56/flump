// @vitest-environment node
// Test-only cookie session: /login sets it, /logout clears it. Off unless E2E_DEV_SESSION=true.
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  getSignInUrl: vi.fn(),
  configure: vi.fn(),
}));

vi.mock("@workos-inc/authkit-react-router", () => ({
  signOut: mocks.signOut,
  getSignInUrl: mocks.getSignInUrl,
  configure: mocks.configure,
}));
vi.mock("~/utils/auth.server", () => ({ ensureSessionStorage: vi.fn() }));
vi.mock("react-router", async () => await vi.importActual("react-router"));

import { loader as loginLoader } from "./login._index";
import { action as logoutAction } from "./logout._index";

const args = (url: string, method = "GET") =>
  ({ request: new Request(url, { method }), params: {}, context: {} }) as any;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("dev session login and logout", () => {
  it("login sets the cookie and goes to /app when enabled", async () => {
    vi.stubEnv("E2E_DEV_SESSION", "true");
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WORKOS_API_KEY", "");
    vi.stubEnv("RAILWAY_ENVIRONMENT", "");
    const res = (await loginLoader(args("http://localhost:3000/login"))) as Response;
    expect(res.headers.get("Location")).toBe("/app");
    expect(res.headers.get("Set-Cookie")).toContain("flump_dev_session=1");
    expect(mocks.getSignInUrl).not.toHaveBeenCalled();
  });

  it("logout clears the cookie and returns to the marketing site when enabled", async () => {
    vi.stubEnv("E2E_DEV_SESSION", "true");
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WORKOS_API_KEY", "");
    vi.stubEnv("RAILWAY_ENVIRONMENT", "");
    vi.stubEnv("VITE_MARKETING_URL", "http://localhost:3001");
    const res = (await logoutAction(args("http://localhost:3000/logout", "POST"))) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("http://localhost:3001");
    expect(res.headers.getSetCookie().join("\n")).toContain("flump_dev_session=; ");
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("login ignores the mode when the flag is off", async () => {
    vi.stubEnv("E2E_DEV_SESSION", "");
    mocks.getSignInUrl.mockResolvedValue({ url: "https://auth.example.test/x", headers: {} });
    const res = (await loginLoader(args("http://localhost:3000/login"))) as Response;
    expect(res.headers.get("Location")).toBe("https://auth.example.test/x");
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });
});
