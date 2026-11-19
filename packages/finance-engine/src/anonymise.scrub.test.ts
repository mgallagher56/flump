import { describe, expect, it } from "vitest";
import { redactAccountNumbers, scrubInstitutionNames } from "./anonymise.js";

describe("scrubInstitutionNames maps every listed look-alike letter to Latin", () => {
  // Each case swaps one Latin letter of a listed institution for its Cyrillic or Greek
  // look-alike. The scrubber maps the look-alike back to the Latin letter, so the name is
  // still caught. If the mapping for that letter were lost, the name would leak through.
  const cases: [string, string][] = [
    ["Cyrillic a (U+0430) in barclays", "bаrclays"],
    ["Cyrillic es (U+0441) in hsbc", "hsbс"],
    ["Cyrillic ie (U+0435) in natwest", "natwеst"],
    ["Cyrillic en (U+043D), read as h, in hsbc", "нsbc"],
    ["Cyrillic i (U+0456) in tide", "tіde"],
    ["Cyrillic ka (U+043A) in kroo", "кroo"],
    ["Cyrillic em (U+043C) in monzo", "мonzo"],
    ["Cyrillic er (U+0440), read as p, in paypal", "рaypal"],
    ["Cyrillic te (U+0442) in tsb", "тsb"],
    ["Cyrillic u (U+0443), read as y, in barclays", "barclaуs"],
    ["Cyrillic ha (U+0445), read as x, in halifax", "halifaх"],
    ["Cyrillic dze (U+0455) in tsb", "tѕb"],
    ["Greek alpha (U+03B1) in amex", "αmex"],
    ["Greek omicron (U+03BF) in monzo", "mοnzo"],
    ["Greek rho (U+03C1) in paypal", "ρaypal"],
    ["Greek nu (U+03BD), read as v, in revolut", "reνolut"],
    ["Greek iota (U+03B9) in tide", "tιde"],
    ["Greek kappa (U+03BA) in klarna", "κlarna"],
    ["Greek tau (U+03C4) in tsb", "τsb"],
  ];

  for (const [label, disguised] of cases) {
    it(`scrubs a name written with ${label}`, () => {
      expect(scrubInstitutionNames(`Paid ${disguised} card`)).toBe("Paid Bank card");
    });
  }

  it("shows the Cyrillic je (U+0458) as a Latin j, even outside a bank name", () => {
    // No listed name contains a j, so the only visible effect is the normalised text itself:
    // "Ma" + Cyrillic je + "or" reads back as "Major".
    expect(scrubInstitutionNames("Maјor")).toBe("Major");
  });
});

describe("redactAccountNumbers redacts sort codes written with spaces", () => {
  it("redacts a sort code separated by spaces", () => {
    // 12 34 56 is a sort code: three pairs of digits with a space between each pair.
    expect(redactAccountNumbers("Sort code 12 34 56 today")).toBe("Sort code [redacted] today");
  });

  it("redacts a sort code that mixes a hyphen and a space, either way round", () => {
    expect(redactAccountNumbers("12-34 56")).toBe("[redacted]");
    expect(redactAccountNumbers("12 34-56")).toBe("[redacted]");
  });
});
