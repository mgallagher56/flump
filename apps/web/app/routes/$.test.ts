import { describe, expect, it } from "vitest";
import NotFoundRoute, { action, ErrorBoundary, loader, meta } from "./$";

async function thrown(fn: () => unknown): Promise<Response> {
  try {
    await fn();
  } catch (error) {
    return error as Response;
  }
  throw new Error("expected a throw");
}

describe("catch-all splat route", () => {
  it("throws a 404 response from the loader", async () => {
    expect((await thrown(loader)).status).toBe(404);
  });

  it("throws a 404 response from the action", async () => {
    expect((await thrown(action)).status).toBe(404);
  });

  // Without a default component the splat is a resource route and React Router sends the thrown
  // Response raw (an unstyled "Not Found" page outside the app shell).
  it("is a UI route with its own error boundary, so the 404 renders inside the app shell", () => {
    expect(typeof NotFoundRoute).toBe("function");
    expect(typeof ErrorBoundary).toBe("function");
  });

  it("titles the page", () => {
    expect(meta({} as Parameters<typeof meta>[0])).toEqual([{ title: "Page not found | Flump" }]);
  });
});
