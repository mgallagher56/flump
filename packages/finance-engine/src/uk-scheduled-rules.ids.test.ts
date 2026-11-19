import { describe, expect, it } from "vitest";
import { UK_SCHEDULED_RULE_IDS, UK_SCHEDULED_RULES } from "./uk-scheduled-rules.js";

describe("UK_SCHEDULED_RULES ids", () => {
  it("each rule carries the id it is filed under, which scenarios ask for it by", () => {
    expect(UK_SCHEDULED_RULE_IDS).toEqual(["ni.salarySacrificePensionCap2029"]);
    for (const id of UK_SCHEDULED_RULE_IDS) {
      expect(UK_SCHEDULED_RULES[id].id).toBe(id);
    }
  });
});
