import { describe, expect, test } from "bun:test";
import { findSyncHashes } from "./lib/skill-sync-commits";

describe("findSyncHashes", () => {
  test("verify-account-erasure at 4c5d20376: a branch hash that never reached main", () => {
    // The two lines as committed; 3b2f27bc... was rewritten by the rebase merge.
    const md = [
      "Sync commit: `3b2f27bcefe54318b303d41ee8d8b4c8c4af800a`. At that commit, the model was confirmed to describe this code:",
      "Check whether the verification needs another look with `git log --oneline 3b2f27bcefe54318b303d41ee8d8b4c8c4af800a..HEAD -- <the paths above>`.",
    ].join("\n");
    expect(findSyncHashes(md)).toEqual([
      { line: 1, hash: "3b2f27bcefe54318b303d41ee8d8b4c8c4af800a" },
      { line: 2, hash: "3b2f27bcefe54318b303d41ee8d8b4c8c4af800a" },
    ]);
  });

  test("verify-bank-sync at f64952e4c: e865290b..., also never on main", () => {
    const md = "Sync commit: `e865290bd3b1d92fa493df280184ce9e4cf1e0dd`. At that commit";
    expect(findSyncHashes(md)).toEqual([
      { line: 1, hash: "e865290bd3b1d92fa493df280184ce9e4cf1e0dd" },
    ]);
  });

  test("a short hash counts too", () => {
    expect(findSyncHashes("Sync commit: `ea54c38`.")).toEqual([{ line: 1, hash: "ea54c38" }]);
  });

  test("a commit named by title passes", () => {
    const md = [
      "Sync commit: the commit on `main` titled `fix(banking): a stale sync's error never replaces a reconnect's status (B2)`.",
      'sync=$(git log -1 --format=%H --fixed-strings --grep="fix(banking): ...")',
      'git log --oneline "$sync"..HEAD -- apps/backend/src',
    ].join("\n");
    expect(findSyncHashes(md)).toEqual([]);
  });

  test("hashes on other lines (a download checksum) are not sync commits", () => {
    const md = "mise install 'http:tla2tools[url=...,checksum=sha1:be24573c45d5aa0ff20a8b96b0e1]'";
    expect(findSyncHashes(md)).toEqual([]);
  });

  test("plain words of hex letters are not hashes", () => {
    expect(findSyncHashes("Sync commit: see the decade facade")).toEqual([]);
  });
});
