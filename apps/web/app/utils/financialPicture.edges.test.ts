// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildWorkspacePicture } from "./financialPicture";

describe("buildWorkspacePicture with rows that are not lists", () => {
  it("treats missing or malformed row lists as empty", () => {
    const picture = buildWorkspacePicture({
      userProfile: null,
      accounts: null,
      accountDetails: undefined,
      budgetEntries: "not a list",
      taxRecords: {},
    });
    // No accounts and no budget rows: nothing is owned, nothing is owed, no rows are listed.
    expect(picture.budgetRows).toEqual([]);
    expect(picture.netWorth.totalAssets).toBe(0);
    expect(picture.netWorth.totalLiabilities).toBe(0);
    expect(picture.netWorth.netWorth).toBe(0);
  });
});
