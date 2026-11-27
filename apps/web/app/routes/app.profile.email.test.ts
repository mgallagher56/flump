// @vitest-environment node
import { UserEmailResponse } from "@flump/api-contract";
import { beforeEach, describe, expect, it, vi } from "vitest";

const backendFetch = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetch: (...a: unknown[]) => backendFetch(...a),
  backendFetchAll: async () => [],
}));
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: async () => ({ user: { id: "u1" }, accessToken: "token" }),
}));

import { BackendError } from "~/services/backend-error";
import { loader } from "./app.profile";

const PROFILE = { id: "u1", email: null };

const runLoader = async () => {
  const result = (await loader({
    request: new Request("https://app.example/app/profile"),
    params: {},
    context: {},
  } as never)) as unknown as { data: { accountEmail: string | null; userProfile: unknown } };
  return result.data;
};

describe("settings loader: account email resolution", () => {
  beforeEach(() => {
    backendFetch.mockReset();
  });

  it("loads the account email from GET /user-profile/email with UserEmailResponse", async () => {
    const sampleEmail = ["person", "example.com"].join("@");
    backendFetch.mockImplementation(async (endpoint: string) => {
      if (endpoint === "/user-profile") return PROFILE;
      if (endpoint === "/user-profile/email") return { email: sampleEmail };
      if (endpoint === "/beta/admin") throw new BackendError("not-found", endpoint, 404);
      if (endpoint === "/household") throw new BackendError("not-found", endpoint, 404);
      throw new Error(`unexpected ${endpoint}`);
    });

    const loaded = await runLoader();
    expect(loaded.accountEmail).toBe(sampleEmail);
    expect(loaded.userProfile).toEqual(PROFILE);
    const emailCall = backendFetch.mock.calls.find(
      ([endpoint]) => endpoint === "/user-profile/email",
    );
    expect(emailCall?.[1]).toMatchObject({ accessToken: "token", schema: UserEmailResponse });
  });

  it("returns null when GET /user-profile/email returns { email: null }", async () => {
    backendFetch.mockImplementation(async (endpoint: string) => {
      if (endpoint === "/user-profile") return PROFILE;
      if (endpoint === "/user-profile/email") return { email: null };
      if (endpoint === "/beta/admin") throw new BackendError("not-found", endpoint, 404);
      if (endpoint === "/household") throw new BackendError("not-found", endpoint, 404);
      throw new Error(`unexpected ${endpoint}`);
    });

    const loaded = await runLoader();
    expect(loaded.accountEmail).toBeNull();
    expect(loaded.userProfile).toEqual(PROFILE);
  });

  it.each([
    ["older backend (404)", new BackendError("not-found", "/user-profile/email", 404)],
    ["server error (500)", new BackendError("server", "/user-profile/email", 500)],
    ["unavailable", new BackendError("unavailable", "/user-profile/email")],
  ])(
    "gives null and still renders the page when /user-profile/email fails (%s)",
    async (_label, failure) => {
      backendFetch.mockImplementation(async (endpoint: string) => {
        if (endpoint === "/user-profile") return PROFILE;
        if (endpoint === "/user-profile/email") throw failure;
        if (endpoint === "/beta/admin") throw new BackendError("not-found", endpoint, 404);
        if (endpoint === "/household") throw new BackendError("not-found", endpoint, 404);
        throw new Error(`unexpected ${endpoint}`);
      });

      const loaded = await runLoader();
      expect(loaded.accountEmail).toBeNull();
      expect(loaded.userProfile).toEqual(PROFILE);
    },
  );
});
