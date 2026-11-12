import { describe, expect, it } from "vitest";
import { UpdateChecklistRequest, UpdateProfileRequest } from "./domains/profile.js";

describe("UpdateProfileRequest", () => {
  it("accepts https and image data-URL avatars, rejects other schemes", () => {
    const avatar = (avatarUrl: string) => UpdateProfileRequest.safeParse({ avatarUrl }).success;
    expect(avatar("https://example.com/a.png")).toBe(true);
    expect(avatar("data:image/png;base64,AAAA")).toBe(true);
    expect(avatar("http://example.com/a.png")).toBe(false);
    expect(avatar("data:text/html;base64,AAAA")).toBe(false);
    expect(avatar(`https://example.com/${"a".repeat(2048)}`)).toBe(false);
  });

  it("allows null on nullable columns and rejects bad percentages", () => {
    expect(UpdateProfileRequest.safeParse({ annualSalary: null, firstName: null }).success).toBe(
      true,
    );
    expect(UpdateProfileRequest.safeParse({ pensionPercent: 101 }).success).toBe(false);
  });
});

describe("UpdateChecklistRequest", () => {
  it("requires a step and a boolean", () => {
    expect(UpdateChecklistRequest.safeParse({ step: "profile", completed: true }).success).toBe(
      true,
    );
    expect(UpdateChecklistRequest.safeParse({ step: "profile", completed: "yes" }).success).toBe(
      false,
    );
  });
});
