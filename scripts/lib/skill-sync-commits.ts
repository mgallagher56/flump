/**
 * A verify skill records the commit where its model was last confirmed. PRs are rebase-merged, so
 * a hash written on a branch never exists on main: name the commit by its title instead
 * (.claude/skills/verify-bank-sync/SKILL.md, "Coverage record", shows the form).
 */

/** A line that records or uses the sync commit. */
function isSyncLine(text: string): boolean {
  return text.toLowerCase().includes("sync commit") || text.includes("..HEAD");
}

const isWordChar = (c: string) =>
  (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === "_";

/** A commit hash: a whole word of 7 to 40 lowercase hex characters, with a digit and a letter. */
function isHash(word: string): boolean {
  if (word.length < 7 || word.length > 40) return false;
  let digit = false;
  let letter = false;
  for (const c of word) {
    if (c >= "0" && c <= "9") digit = true;
    else if (c >= "a" && c <= "f") letter = true;
    else return false;
  }
  return digit && letter;
}

/** The words of a line, split by hand rather than with a pattern. */
function words(text: string): string[] {
  const out: string[] = [];
  let current = "";
  for (const c of text) {
    if (isWordChar(c)) current += c;
    else if (current) {
      out.push(current);
      current = "";
    }
  }
  if (current) out.push(current);
  return out;
}

export interface SyncHashHit {
  line: number;
  hash: string;
}

export function findSyncHashes(markdown: string): SyncHashHit[] {
  return markdown.split("\n").flatMap((text, i) => {
    if (!isSyncLine(text)) return [];
    const hash = words(text).find(isHash);
    return hash ? [{ line: i + 1, hash }] : [];
  });
}
