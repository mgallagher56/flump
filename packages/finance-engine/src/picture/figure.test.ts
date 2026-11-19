import { describe, expect, it } from "vitest";
import { figureKnown, figureUnknown, isFigureKnown } from "./figure.js";

describe("figureUnknown", () => {
  it("is an unknown figure naming what is missing, with no reason key when none is given", () => {
    const fig = figureUnknown(["budget"]);
    expect(fig).toStrictEqual({ status: "unknown", missing: ["budget"] });
    expect(isFigureKnown(fig)).toBe(false);
  });

  it("carries the reason when one is given", () => {
    expect(figureUnknown(["annualSalary"], "not-set")).toStrictEqual({
      status: "unknown",
      missing: ["annualSalary"],
      reason: "not-set",
    });
  });
});

describe("figureKnown", () => {
  it("leaves out an empty assumptions list", () => {
    expect(figureKnown(5, "derived", [])).toStrictEqual({
      status: "known",
      value: 5,
      provenance: "derived",
    });
  });
});
