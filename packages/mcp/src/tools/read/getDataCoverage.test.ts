import type { BuildContextPackInput } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { shortId, shortIdKey } from "../../short-ids.js";
import { connectTestClient, TEST_TOKEN } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";

type Account = Record<string, unknown> & { id: string; gaps: unknown[]; gapsTruncated: boolean };
type Env = {
  result: { accounts: Account[] };
  missing: Array<{ field: string; why: string; askUser: string }>;
  provenance: Record<string, string>;
};

const coverageOf = async (data: BuildContextPackInput) => {
  const h = await connectTestClient(data);
  try {
    return (await h.callJson("get_data_coverage", {})) as Env;
  } finally {
    await h.close();
  }
};
const acc = (uuid: string) => shortId(shortIdKey(TEST_TOKEN), "acc", uuid);

/** `count` rows every other month from January 2020: count - 1 one-month gaps between them. */
const everyOtherMonth = (accountId: string, count: number) =>
  Array.from({ length: count }, (_, i) => {
    const idx = 2020 * 12 + 2 * i;
    return { accountId, year: Math.floor(idx / 12), month: (idx % 12) + 1, value: 100 };
  });

const saver = (id: string) => ({ id, name: "Saver", type: "Saving", balance: 100 });

describe("get_data_coverage", () => {
  it("lists at most 12 gaps an account and flags only a longer list as cut short", async () => {
    const e = await coverageOf({
      ...emptyUser,
      accounts: [saver("thirteen"), saver("twelve"), saver("none")],
      // 14 rows leave 13 gaps; 13 rows leave 12.
      accountDetails: [...everyOtherMonth("thirteen", 14), ...everyOtherMonth("twelve", 13)],
    });
    const byId = Object.fromEntries(e.result.accounts.map((a) => [a.id, a]));
    expect(byId[acc("thirteen")]?.gaps).toHaveLength(12);
    expect(byId[acc("thirteen")]?.gapsTruncated).toBe(true);
    expect(byId[acc("twelve")]?.gaps).toHaveLength(12);
    expect(byId[acc("twelve")]?.gapsTruncated).toBe(false);
    expect(byId[acc("none")]).toMatchObject({ gaps: [], gapsTruncated: false });
    // Some accounts have history, so nothing is asked.
    expect(e.missing).toEqual([]);
    expect(e.provenance).toMatchObject({ accounts: "account_history" });
  });

  it("asks for history when no account has any", async () => {
    const e = await coverageOf({ ...emptyUser, accounts: [saver("a")] });
    expect(e.missing.map((m) => m.field)).toEqual(["accountHistory"]);
    expect(e.missing[0]?.why.length).toBeGreaterThan(0);
  });

  it("asks only for accounts when there are none", async () => {
    const e = await coverageOf(emptyUser);
    expect(e.missing.map((m) => m.field)).toEqual(["accounts"]);
  });

  it("refuses a page past the last, naming the page field", async () => {
    const h = await connectTestClient({ ...emptyUser, accounts: [saver("a")] });
    try {
      const res = await h.client.callTool({ name: "get_data_coverage", arguments: { page: 2 } });
      expect(res.isError).toBe(true);
      const error = JSON.parse((res.content as Array<{ text: string }>)[0]?.text ?? "{}").error;
      expect(error).toMatchObject({ code: "INVALID_ARGUMENT", field: "page" });
    } finally {
      await h.close();
    }
  });
});
