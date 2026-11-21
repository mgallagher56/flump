// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertProductionEnv } from "./requiredEnv";

describe("assertProductionEnv without NODE_ENV", () => {
  it("does nothing when NODE_ENV is not set at all", () => {
    expect(() => assertProductionEnv({})).not.toThrow();
  });
});
