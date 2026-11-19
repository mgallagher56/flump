import { beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; the loader needs the real `data`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const loadWorkspacePicture = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  loadWorkspacePicture: (...a: unknown[]) => loadWorkspacePicture(...a),
}));
vi.mock("~/containers/budget/BudgetContainer", () => ({ default: () => null }));

import { loader } from "./app.budget";

describe("app.budget loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadWorkspacePicture.mockResolvedValue({
      accounts: [],
      accountDetails: [],
      budgetEntries: [],
      userProfile: { id: "p1" },
      user: { id: "u1" },
      accessToken: "server-only-token",
      picture: null,
    });
  });

  it("returns the workspace data without an accessToken key", async () => {
    const args = { request: new Request("http://localhost/app/budget"), params: {}, context: {} };
    const result = (await loader(args as never)) as unknown as { data: Record<string, unknown> };
    const payload = result.data;

    expect(Object.keys(payload).sort()).toEqual(
      ["accountDetails", "accounts", "budgetEntries", "picture", "user", "userProfile"].sort(),
    );
    expect(payload).not.toHaveProperty("accessToken");
    expect(JSON.stringify(payload)).not.toContain("server-only-token");
    expect(loadWorkspacePicture).toHaveBeenCalledWith(args);
  });
});
