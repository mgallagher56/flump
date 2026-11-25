/**
 * A verify skill records the commit where its model was last confirmed. PRs are rebase-merged, so
 * a hash written on a branch never exists on main: name the commit by its title instead
 * (.claude/skills/verify-bank-sync/SKILL.md, "Coverage record", shows the form).
 */

/** A line that records or uses the sync commit. */
const SYNC_LINE = /sync commit|\.\.HEAD\b/i;
/** A commit hash: 7 to 40 hex characters with at least one digit and one letter. */
const HASH = /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/;

export interface SyncHashHit {
  line: number;
  hash: string;
}

export function findSyncHashes(markdown: string): SyncHashHit[] {
  return markdown.split("\n").flatMap((text, i) => {
    if (!SYNC_LINE.test(text)) return [];
    const match = HASH.exec(text);
    return match ? [{ line: i + 1, hash: match[0] }] : [];
  });
}
