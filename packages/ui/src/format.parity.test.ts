/**
 * Pins `@flump/format` (the formatter mobile will use) to what the web shows today through
 * `Money` and `Num`: every currency and percent row of the cross-platform fixture must come out
 * of `formatMoney` / `formatNumber` as the same string. If `Money` changes its output, this fails
 * and the shared fixture (and so every platform) changes with it.
 */
import { FORMAT_FIXTURES, type FormatCase } from "@flump/format/fixtures";
import { describe, expect, it } from "vitest";
import { formatMoney, formatNumber, isKnownNumber } from "./primitives/Money/Money";

type Pinned = Extract<
  FormatCase,
  { fn: "formatCurrency" | "formatCompactCurrency" | "formatPercent" }
>;

const NOT_SET = "Not set"; // Money's default notSetLabel

function viaMoney(c: Pinned): string {
  const [value] = c.args;
  const placeholder =
    (c.fn === "formatPercent" ? c.args[1]?.placeholder : c.args[2]?.placeholder) ?? NOT_SET;
  if (!isKnownNumber(value)) return placeholder;
  switch (c.fn) {
    case "formatCurrency":
      return formatMoney(value, {
        currency: c.args[1],
        fractionDigits: c.args[2]?.fractionDigits,
        compact: c.args[2]?.compact,
      }).text;
    case "formatCompactCurrency":
      return formatMoney(value, { currency: c.args[1], compact: true }).text;
    case "formatPercent": {
      const { fraction, fractionDigits } = c.args[1] ?? {};
      return formatNumber(fraction ? value * 100 : value, { kind: "percent", fractionDigits }).text;
    }
  }
}

const pinned = FORMAT_FIXTURES.filter(
  (c): c is Pinned =>
    c.fn === "formatCurrency" || c.fn === "formatCompactCurrency" || c.fn === "formatPercent",
);

describe("@flump/format agrees with Money and Num", () => {
  it("covers the currency and percent rows", () => {
    expect(pinned.length).toBeGreaterThan(30);
  });

  it.each(pinned.map((c) => [c.fn, JSON.stringify(c.args), c] as const))(
    "%s(%s)",
    (_fn, _args, c) => {
      expect(viaMoney(c)).toBe(c.expected);
    },
  );
});
