import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../../testing/client.js";
import { SEEDED_BATCH_ID } from "../../testing/fake-imports.js";
import { emptyUser } from "../../testing/personas.js";

describe("get_import_status", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });

  it("reads the seeded batch and says where the result comes from", async () => {
    h = await connectTestClient(emptyUser);
    const e = (await h.callJson("get_import_status", { batchId: SEEDED_BATCH_ID })) as {
      result: { batchId: string; status: string };
      provenance: Record<string, string>;
    };
    expect(e.result).toMatchObject({ batchId: SEEDED_BATCH_ID, status: "committed" });
    expect(e.provenance.batch).toBe("import_batches");
  });
});
