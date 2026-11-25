// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => await vi.importActual("react-router"));
vi.mock("@flump/business-details", async (orig) => ({
  ...(await orig<typeof import("@flump/business-details")>()),
  // A terms version published and not yet in force.
  hasUpcomingAcceptanceChange: () => true,
}));
const getAuthSession = vi.fn();
vi.mock("~/utils/auth.server", async (orig) => ({
  ...(await orig<typeof import("~/utils/auth.server")>()),
  getAuthSession: (...a: unknown[]) => getAuthSession(...a),
}));
vi.mock("./services/root-profile.server", () => ({
  loadRootProfile: async () => ({ id: "p1", onboardingCompleted: true }),
}));
vi.mock("./services/beta-mode.server", () => ({ isInviteOnly: async () => false }));
const backendFetch = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetch: (...a: unknown[]) => backendFetch(...a),
}));

import { loader } from "./root";

const page = (version: string, effectiveFrom: string, changed: boolean) => ({
  version,
  updated: "25 November 2026",
  effectiveFrom,
  path: "/terms",
  changed,
});
const upcoming = {
  required: false,
  agreed: false,
  firstTime: false,
  terms: page("0.2", "2026-12-09", true),
  privacyNotice: { ...page("0.2", "2026-11-25", false), path: "/privacy" },
};

const load = (path: string) =>
  loader({
    request: new Request(`http://localhost${path}`),
    params: {},
    context: {},
  } as never) as Promise<{ termsUpcoming: unknown }>;

describe("root loader: a coming terms change (terms acceptance)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({ accessToken: "tok", user: { id: "u1" } });
    backendFetch.mockResolvedValue(upcoming);
  });

  it("reads the terms status on the home page and shows the coming change", async () => {
    const data = await load("/");
    expect(backendFetch).toHaveBeenCalledWith(
      "/user-profile/terms-acceptance",
      expect.objectContaining({ accessToken: "tok" }),
    );
    expect(data.termsUpcoming).toEqual({
      terms: true,
      privacyNotice: false,
      effectiveFrom: "2026-12-09",
    });
  });

  it("spends no read on any other page", async () => {
    for (const path of ["/app/budget", "/app/accounts", "/app/profile"]) {
      const data = await load(path);
      expect(data.termsUpcoming, path).toBeNull();
    }
    expect(backendFetch).not.toHaveBeenCalled();
  });
});
