import { PreconditionFailedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { expectedVersion, setEtag, withVersionClaim } from "./etag";

describe("expectedVersion", () => {
  it("is undefined without an If-Match header", () => {
    expect(expectedVersion(undefined)).toBeUndefined();
    expect(expectedVersion("  ")).toBeUndefined();
  });

  it("reads this API's ETag, strong or weak", () => {
    expect(expectedVersion('"2026-11-14T09:30:00.123Z"')?.toISOString()).toBe(
      "2026-11-14T09:30:00.123Z",
    );
    expect(expectedVersion('W/"2026-11-14T09:30:00.123Z"')?.toISOString()).toBe(
      "2026-11-14T09:30:00.123Z",
    );
  });

  it("answers 412 for a value that can never match", () => {
    for (const value of ["*", "abc", "2026-11-14T09:30:00.123Z", '"a", "b"']) {
      expect(() => expectedVersion(value)).toThrow(PreconditionFailedException);
    }
  });
});

describe("setEtag", () => {
  it("quotes the ISO timestamp and ignores a missing response or date", () => {
    const res = { setHeader: vi.fn() };
    setEtag(res, new Date("2026-11-14T09:30:00.123Z"));
    expect(res.setHeader).toHaveBeenCalledWith("ETag", '"2026-11-14T09:30:00.123Z"');
    res.setHeader.mockClear();
    setEtag(res, undefined);
    setEtag(res, "not a date");
    setEtag(undefined, new Date());
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});

describe("withVersionClaim", () => {
  it("runs the work on the plain repository when no version is expected", async () => {
    const repository = { manager: { transaction: vi.fn() } };
    const result = await withVersionClaim(
      repository as never,
      { id: "x", user_id: "u" },
      undefined,
      () => new Error("missing"),
      async (repo) => (repo === (repository as never) ? "plain" : "other"),
    );
    expect(result).toBe("plain");
    expect(repository.manager.transaction).not.toHaveBeenCalled();
  });
});
