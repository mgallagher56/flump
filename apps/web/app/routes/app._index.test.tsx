import { describe, expect, it, vi } from "vitest";
import { loader } from "./app._index";

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { redirect: actual.redirect };
});

vi.mock("~/utils/auth.server", () => ({
  getAuthSession: vi.fn().mockResolvedValue({ user: null, accessToken: null }),
}));

vi.mock("~/services/backend-client.server", () => ({ backendFetch: vi.fn() }));

describe("app._index route", () => {
  it("sends a signed-out visitor with ?demo=true to /sandbox, not /login", async () => {
    const request = new Request("http://localhost/app?demo=true");
    const result = (await loader({ request, params: {}, context: {} } as any)) as Response;
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe("/sandbox");
  });

  it("sends a signed-out visitor without the parameter to /login", async () => {
    const request = new Request("http://localhost/app");
    const result = (await loader({ request, params: {}, context: {} } as any)) as Response;
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe("/login");
  });
});
