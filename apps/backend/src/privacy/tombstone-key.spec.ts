import { describe, expect, it } from "vitest";
import {
  resolveTombstoneKey,
  TOMBSTONE_KEY_ENV_VAR,
  tombstoneExpiry,
  tombstoneSubjectHash,
} from "./tombstone-key";

const KEY = "k".repeat(32);

describe("resolveTombstoneKey", () => {
  it("falls back to a fixed key in development and test only", () => {
    const dev = resolveTombstoneKey({ NODE_ENV: "development" });
    expect(dev).toBeTruthy();
    expect(resolveTombstoneKey({ NODE_ENV: "test" })).toBe(dev);
    expect(resolveTombstoneKey({ NODE_ENV: "test", [TOMBSTONE_KEY_ENV_VAR]: KEY })).toBe(KEY);
  });

  it.each([
    ["production", { NODE_ENV: "production" }],
    ["NODE_ENV unset", {}],
    ["a short key", { NODE_ENV: "production", [TOMBSTONE_KEY_ENV_VAR]: "short" }],
  ])("returns null (deletion fails closed) for %s", (_label, env) => {
    expect(resolveTombstoneKey(env)).toBeNull();
  });

  it("uses a configured key of 32 or more characters in production", () => {
    expect(resolveTombstoneKey({ NODE_ENV: "production", [TOMBSTONE_KEY_ENV_VAR]: KEY })).toBe(KEY);
  });
});

describe("tombstoneSubjectHash", () => {
  it("is a stable 64-character hex HMAC that depends on the key and never contains the id", () => {
    const a = tombstoneSubjectHash(KEY, "user_01HZX3Q9V7C2M8N4P6R0S5T1WY");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(tombstoneSubjectHash(KEY, "user_01HZX3Q9V7C2M8N4P6R0S5T1WY")).toBe(a);
    expect(tombstoneSubjectHash("j".repeat(32), "user_01HZX3Q9V7C2M8N4P6R0S5T1WY")).not.toBe(a);
    expect(tombstoneSubjectHash(KEY, "user_other")).not.toBe(a);
    expect(a).not.toContain("user_");
  });
});

describe("tombstoneExpiry", () => {
  it("is 24 months after the deletion", () => {
    expect(tombstoneExpiry(new Date("2026-11-14T10:00:00Z")).toISOString()).toBe(
      "2028-11-14T10:00:00.000Z",
    );
  });
});
