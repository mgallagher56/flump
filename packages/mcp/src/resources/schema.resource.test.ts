import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { emptyUser } from "../testing/personas.js";
import { SCHEMA_DOCUMENT, SCHEMA_RESOURCE_URI } from "./schema.resource.js";

describe("schema resource", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });

  it("marks exactly debts, mortgages and student loans as owed", () => {
    const owed = SCHEMA_DOCUMENT.accountCategories.filter((c) => c.isLiability).map((c) => c.id);
    expect(owed).toEqual(["debt", "mortgages", "studentLoans"]);
  });

  it("explains every account category", () => {
    for (const c of SCHEMA_DOCUMENT.accountCategories) {
      expect(typeof c.meaning, c.id).toBe("string");
      expect(c.meaning.length, c.id).toBeGreaterThan(0);
    }
  });

  it("serves the dictionary as JSON", async () => {
    h = await connectTestClient(emptyUser);
    const { contents } = await h.client.readResource({ uri: SCHEMA_RESOURCE_URI });
    expect(contents[0]?.mimeType).toBe("application/json");
    expect(JSON.parse(String(contents[0]?.text)).schemaVersion).toBe("1");
  });
});
