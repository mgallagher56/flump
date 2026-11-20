import { describe, expect, it } from "vitest";
import { caretAfterGrouping, groupTypedNumber, shouldRegroup } from "./useNumericText";

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
    // A second point after the pence is not a plain number, so the whole part is not regrouped.
    expect(groupTypedNumber("12345.6.7")).toBe("12345.6.7");
    // Commas with no digits are left as typed rather than dropped.
    expect(groupTypedNumber(",")).toBe(",");
  });
});

describe("caretAfterGrouping", () => {
  it("keeps a caret after a typed point after it", () => {
    // Typed "1234.|" (5 characters before the caret) -> "1,234.|"
    expect(caretAfterGrouping("1,234.", 5)).toBe(6);
  });

  it("puts the caret after the same digit", () => {
    // Typed "1234|" -> "1,234|"
    expect(caretAfterGrouping("1,234", 4)).toBe(5);
    // Caret after the first two digits of "12345" stays after them: "12|,345".
    expect(caretAfterGrouping("12,345", 2)).toBe(2);
    expect(caretAfterGrouping("1,234", 0)).toBe(0);
  });

  it("puts the caret at the end when more characters were before it than the text has", () => {
    // "1,234" has 4 characters other than commas, so 5 before the caret can only mean the end.
    expect(caretAfterGrouping("1,234", 5)).toBe(5);
  });
});

describe("shouldRegroup", () => {
  it("regroups a valid number, or one digit typed into or one character deleted from one", () => {
    expect(shouldRegroup("1234", "123")).toBe(true);
    expect(shouldRegroup("1,2345", "1,234")).toBe(true);
    expect(shouldRegroup("12,34", "12,345")).toBe(true);
    // Millions: commas every three digits throughout.
    expect(shouldRegroup("1,234,567", "")).toBe(true);
    // Any digit typed just after a comma, including the lowest and highest.
    expect(shouldRegroup("1,0234", "1,234")).toBe(true);
    expect(shouldRegroup("1,9234", "1,234")).toBe(true);
  });

  it("does not regroup when the typed character is not a digit or the text is not a number", () => {
    // A second comma typed next to the first: the new character is a comma, not a digit.
    expect(shouldRegroup("1,,234", "1,234")).toBe(false);
    // A digit after a space is not a plain number at all.
    expect(shouldRegroup("1 2", "1 ")).toBe(false);
  });

  it("leaves a comma typed as a decimal point, and pasted stray commas, as typed", () => {
    expect(shouldRegroup("1,", "1")).toBe(false);
    expect(shouldRegroup("1,5", "1,")).toBe(false);
    expect(shouldRegroup("1,23", "")).toBe(false);
  });
});
