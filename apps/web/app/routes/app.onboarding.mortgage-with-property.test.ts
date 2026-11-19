// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetch } = vi.hoisted(() => ({ backendFetch: vi.fn() }));
vi.mock("~/services/backend-client.server", () => ({ backendFetch }));
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: vi.fn().mockResolvedValue({ accessToken: "token" }),
  requireAccessToken: ({ accessToken }: { accessToken: string }) => accessToken,
}));

import { action } from "./app.onboarding.mortgage-with-property";

const post = (body: unknown, method = "POST") =>
  action({
    request: new Request("http://localhost/app/onboarding/mortgage-with-property", {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(body) : undefined,
    }),
    params: {},
    context: {},
  } as never);

const payload = {
  mortgage: { name: "Residential Mortgage", balance: 186000 },
  property: { balance: 310000 },
};

describe("onboarding mortgage-with-property action (slice 4)", () => {
  beforeEach(() => backendFetch.mockReset());

  it("creates the mortgage and its home in one backend call", async () => {
    backendFetch.mockResolvedValue({ mortgage: { id: "m" }, property: { id: "p" } });
    const response = await post({ payload, key: "k1" });
    expect(response.status).toBe(201);
    expect(backendFetch).toHaveBeenCalledTimes(1);
    expect(backendFetch).toHaveBeenCalledWith(
      "/accounts/mortgage-with-property",
      expect.objectContaining({
        method: "POST",
        accessToken: "token",
        body: payload,
        idempotencyKey: "onboarding-pair:k1",
      }),
    );
  });

  it("refuses a missing payload without calling the backend", async () => {
    expect((await post({})).status).toBe(400);
    expect(backendFetch).not.toHaveBeenCalled();
  });
});
