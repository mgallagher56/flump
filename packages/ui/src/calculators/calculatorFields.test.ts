import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("number inputs in calculators use the input boundary token via styles files", () => {
  const dirs = ["Section24Calculator"];
  it.each(dirs)("%s has no inline styles and uses border.input", (dir) => {
    const tsx = readFileSync(join(__dirname, dir, `${dir}.tsx`), "utf8");
    const styles = readFileSync(join(__dirname, dir, `${dir}.styles.ts`), "utf8");
    expect(tsx).not.toContain("style={{");
    expect(styles).toContain('"border.input"');
  });
});
