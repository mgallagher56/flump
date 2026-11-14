// Ratchet for UX-GUIDELINES rule F2 (check K1): money and percentages are typed into
// CurrencyInput, PercentInput or TextInput with inputMode, never `<input type="number">`
// (a scroll changes the value, and bad input is dropped silently). Count the attribute per
// file; a file may never gain one, and its baseline entry must shrink as it migrates.

// `type="number"`, `type='number'`, `type={"number"}` and `type: "number"` (a props object).
// The lookbehind skips CSS attribute selectors such as `input[type="number"]` and
// `"&[type='number']"`, and longer names such as `inputType="number"` or `data-type`.
const NUMBER_TYPE = /(?<![[\w-])type\s*(?:=\s*\{?\s*|:\s*)(["'`])number\1/g;

export function countNumberInputs(source: string): number {
  // Strip comments so a mention in prose does not count.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  return code.match(NUMBER_TYPE)?.length ?? 0;
}
