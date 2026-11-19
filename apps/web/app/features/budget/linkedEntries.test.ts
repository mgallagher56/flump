import { describe, expect, it } from "vitest";
import { isNotSetEntry, notSetActionFor } from "./linkedEntries";

describe("notSetActionFor", () => {
  it("sends a take-home that is not set to the salary in Profile", () => {
    expect(notSetActionFor({ linked: "take_home" }, null)).toEqual({
      to: "/app/profile#settings-age-and-pay",
      label: "Add your salary",
    });
  });

  it("sends a mortgage holder's housing line to the mortgage page", () => {
    expect(notSetActionFor({ linked: "housing" }, "mortgage")).toEqual({
      to: "/app/mortgage",
      label: "Add your mortgage payment",
    });
  });

  it("has no link for a rent, which is typed on the line itself", () => {
    expect(notSetActionFor({ linked: "housing" }, "renting")).toBeNull();
  });
});

describe("isNotSetEntry", () => {
  it("is true only for a linked line marked not set", () => {
    expect(isNotSetEntry({ notSet: true })).toBe(true);
    expect(isNotSetEntry({})).toBe(false);
  });
});
