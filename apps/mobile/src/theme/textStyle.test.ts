import { textStyles } from "@flump/tokens/native";
import { textStyle } from "./textStyle";

describe("textStyle", () => {
  it("copies the token's size, weight and line height and drops the font role", () => {
    // body.md in the tokens: 16 px, weight 400, line height 24.
    expect(textStyle("body.md")).toEqual({
      fontSize: 16,
      fontWeight: "400",
      lineHeight: 24,
      letterSpacing: 0,
    });
  });

  it("keeps tabular numerals on numeric styles", () => {
    expect(textStyle("numeric.md").fontVariant).toEqual(["tabular-nums"]);
  });

  it("reads the tokens rather than a copy", () => {
    expect(textStyle("heading.lg").fontSize).toBe(textStyles["heading.lg"].fontSize);
  });
});
