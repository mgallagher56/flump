import { describe, expect, it } from "vitest";
import { getUserInitials, processImageFile, resolveUserInitials } from "./avatar";

describe("getUserInitials", () => {
  it("returns initials from full names", () => {
    expect(getUserInitials("Marc Gallagher")).toBe("MG");
    expect(getUserInitials("John Doe")).toBe("JD");
    expect(getUserInitials("Alice Bob Charlie")).toBe("AC");
  });

  it("handles single-word names", () => {
    expect(getUserInitials("Marc")).toBe("MA");
    expect(getUserInitials("M")).toBe("M");
  });

  it("handles email addresses", () => {
    expect(getUserInitials("mgrdevuk@gmail.com")).toBe("MG");
    expect(getUserInitials("john.doe@example.com")).toBe("JD");
    expect(getUserInitials("user@example.com")).toBe("US");
  });

  it("handles empty or whitespace strings", () => {
    expect(getUserInitials("")).toBe("U");
    expect(getUserInitials("   ")).toBe("U");
    expect(getUserInitials(null)).toBe("U");
    expect(getUserInitials(undefined)).toBe("U");
  });
});

describe("resolveUserInitials", () => {
  it("prioritizes displayName when present", () => {
    expect(
      resolveUserInitials({
        displayName: "Jane Doe",
        user: { email: "other@example.com" },
      }),
    ).toBe("JD");
  });

  it("falls back to user firstName and lastName", () => {
    expect(
      resolveUserInitials({
        displayName: null,
        user: { firstName: "Jane", lastName: "Smith" },
      }),
    ).toBe("JS");
  });

  it("falls back to user full name", () => {
    expect(
      resolveUserInitials({
        displayName: null,
        user: { name: "Bob Martin" },
      }),
    ).toBe("BM");
  });

  it("falls back to user email", () => {
    expect(
      resolveUserInitials({
        displayName: null,
        user: { email: "alice.jones@test.com" },
      }),
    ).toBe("AJ");
  });

  it("falls back to explicit firstName and lastName options", () => {
    expect(resolveUserInitials({ firstName: "Alice", lastName: "Smith" })).toBe("AS");
    expect(resolveUserInitials({ firstName: "Alice" })).toBe("AL");
    expect(resolveUserInitials({ lastName: "Smith" })).toBe("SM");
  });

  it("handles metadata and single names on user object", () => {
    expect(
      resolveUserInitials({
        user: { user_metadata: { first_name: "Tom", last_name: "Hanks" } },
      }),
    ).toBe("TH");
    expect(
      resolveUserInitials({
        user: { firstName: "Tom" },
      }),
    ).toBe("TO");
    expect(
      resolveUserInitials({
        user: { lastName: "Hanks" },
      }),
    ).toBe("HA");
    expect(
      resolveUserInitials({
        user: { user_metadata: { full_name: "Charlie Brown" } },
      }),
    ).toBe("CB");
  });

  it("falls back to U when no details exist", () => {
    expect(resolveUserInitials({ displayName: null, user: null })).toBe("U");
  });
});

describe("processImageFile", () => {
  it("rejects non-image files", async () => {
    const file = new File(["test"], "doc.txt", { type: "text/plain" });
    await expect(processImageFile(file)).rejects.toThrow("Selected file must be an image.");
  });

  it("rejects files larger than 5MB", async () => {
    const bigBlob = new Blob([new Uint8Array(6 * 1024 * 1024)]);
    const file = new File([bigBlob], "big.png", { type: "image/png" });
    await expect(processImageFile(file)).rejects.toThrow("Image size must be less than 5MB.");
  });

  it("processes valid image files", async () => {
    const file = new File(["fake-image-bytes"], "avatar.png", { type: "image/png" });
    const result = await processImageFile(file);
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });
});
