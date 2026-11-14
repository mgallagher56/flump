import { beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; the loader needs the real `data`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

// Built at runtime so no secret-looking literal sits in the source.
const SESSION_TOKEN = ["sentinel", "session", "token", String(Date.now())].join("-");

const getAuthSession = vi.fn();
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: (...a: unknown[]) => getAuthSession(...a),
  requireAccessToken: ({ accessToken }: { accessToken?: string | null }) => accessToken,
}));

const backendFetch = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetch: (...a: unknown[]) => backendFetch(...a),
}));

import { loader } from "./app.onboarding";

describe("app.onboarding loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({ user: { id: "u1" }, accessToken: SESSION_TOKEN });
    backendFetch.mockResolvedValue({ id: "p1", enabledPages: ["accounts"] });
  });

  it("returns the profile and user without any access token", async () => {
    const args = {
      request: new Request("http://localhost/app/onboarding"),
      params: {},
      context: {},
    };
    const result = (await loader(args as never)) as unknown as { data: Record<string, unknown> };

    // Positive control: the server really used the token to load the profile.
    expect(backendFetch).toHaveBeenCalledWith(
      "/user-profile",
      expect.objectContaining({ accessToken: SESSION_TOKEN }),
    );
    expect(Object.keys(result.data).sort()).toEqual(["user", "userProfile"]);
    expect(result.data).not.toHaveProperty("accessToken");
    expect(JSON.stringify(result.data)).not.toContain(SESSION_TOKEN);
  });

  it("sends someone who has finished setup to the dashboard", async () => {
    backendFetch.mockResolvedValueOnce({ id: "p1", onboardingCompleted: true });
    const args = {
      request: new Request("http://localhost/app/onboarding"),
      params: {},
      context: {},
    };
    const result = (await loader(args as never)) as unknown as Response;
    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe("/");
  });
});
