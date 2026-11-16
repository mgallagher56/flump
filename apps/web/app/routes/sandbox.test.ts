import { describe, expect, it } from "vitest";
import SandboxRoute, { loader } from "./sandbox";

describe("sandbox redirect route", () => {
  it("redirects /sandbox to /signup with a 302", async () => {
    const response = await loader({
      request: new Request("http://localhost/sandbox"),
      params: {},
      context: {},
    } as never);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/signup");
  });

  it("redirects /sandbox with query parameters to /signup", async () => {
    const response = await loader({
      request: new Request("http://localhost/sandbox?persona=debt"),
      params: {},
      context: {},
    } as never);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/signup");
  });

  it("renders null as a redirect-only route", () => {
    expect(SandboxRoute()).toBeNull();
  });
});
