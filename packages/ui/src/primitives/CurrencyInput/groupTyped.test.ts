import { describe, expect, it } from "vitest";
import { caretAfterGrouping, groupTypedNumber } from "./useNumericText";

describe("groupTypedNumber", () => {
  it("regroups the whole-number part only", () => {
    expect(groupTypedNumber("1234567")).toBe("1,234,567");
    expect(groupTypedNumber("12,34")).toBe("1,234");
    expect(groupTypedNumber("-1234.5")).toBe("-1,234.5");
    expect(groupTypedNumber("£ 98765")).toBe("£ 98,765");
    expect(groupTypedNumber("999")).toBe("999");
  });

  it("leaves text that is not a plain number alone", () => {
    expect(groupTypedNumber("")).toBe("");
    expect(groupTypedNumber("-")).toBe("-");
    expect(groupTypedNumber("1.2.3")).toBe("1.2.3");
  });
});

describe("caretAfterGrouping", () => {
  it("puts the caret after the same digit", () => {
    // Typed "1234|" -> "1,234|"
    expect(caretAfterGrouping("1,234", 4)).toBe(5);
    // Caret after the first two digits of "12345" stays after them: "12|,345".
    expect(caretAfterGrouping("12,345", 2)).toBe(2);
    expect(caretAfterGrouping("1,234", 0)).toBe(0);
  });
});
