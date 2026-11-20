// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AI_CONNECTION, FEATURES, FEATURES_INDEX, MONEY_AREAS } from "./featureAreas";

/** The web app's own labels: the area names on the site must be the ones a tester sees there. */
const appLabels = JSON.parse(
  readFileSync(resolve(__dirname, "../../../web/public/locales/en/common.json"), "utf8"),
) as Record<string, string>;

describe("featureAreas (E42 S1)", () => {
  it("names the five areas exactly as the app's navigation does, in the app's order", () => {
    expect(MONEY_AREAS.map((area) => area.name)).toEqual([
      "Accounts",
      "Budget",
      "Pay",
      "Savings and pension",
      "Debt and borrowing",
    ]);
    for (const area of MONEY_AREAS) expect(area.name).toBe(appLabels[area.appLabelKey]);
  });

  it("puts every feature at /features/<key>, unique, with the AI connection last", () => {
    expect(FEATURES.map((f) => f.path)).toEqual(FEATURES.map((f) => `/features/${f.key}`));
    expect(new Set(FEATURES.map((f) => f.path)).size).toBe(FEATURES.length);
    expect(FEATURES.at(-1)).toBe(AI_CONNECTION);
    expect(FEATURES_INDEX.path).toBe("/features");
    expect(FEATURES_INDEX.title).toBe("Flump features");
  });

  it("keeps each h1 to 2 to 6 words and 40 characters, and each lead to one sentence (guide 3.1, 5.2)", () => {
    for (const feature of [...FEATURES, FEATURES_INDEX]) {
      const h1 = "h1" in feature ? feature.h1 : feature.title;
      expect(h1.split(" ").length, h1).toBeGreaterThanOrEqual(2);
      expect(h1.split(" ").length, h1).toBeLessThanOrEqual(6);
      expect(h1.length, h1).toBeLessThanOrEqual(40);
      expect(feature.lead.match(/\./g)?.length, feature.lead).toBe(1);
    }
  });

  it("gives every page three facts and every money area some depth, with no sentence over 25 words", () => {
    for (const feature of FEATURES) {
      expect(feature.facts).toHaveLength(3);
      if (feature.key !== "ai-connection") expect(feature.depth.length).toBeGreaterThanOrEqual(3);
      for (const text of [...feature.facts, feature.lead, feature.meta.description]) {
        for (const sentence of text.split(/(?<=\.)\s+/)) {
          expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(25);
        }
      }
    }
  });

  it("never says 'What Flump covers' and never names a forecast (D1, E16 D5-B)", () => {
    const all = JSON.stringify([FEATURES, FEATURES_INDEX]);
    expect(all).not.toMatch(/what flump covers/i);
    expect(all).not.toMatch(/\bforecast/i);
  });
});
