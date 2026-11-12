import { describe, expect, it } from "vitest";
import { action, loader } from "./$";

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
});
