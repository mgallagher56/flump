/**
 * Owner sign-off workflow for UK tax vectors (E22). Pure helpers; the CLI is scripts/tax-signoff.ts.
 * Agents never run `apply`: the owner does, and the CLI refuses in CI.
 */
import {
  SIGNOFF_OWNER,
  type SignableVector,
  vectorSignoffHash,
} from "../../packages/finance-engine/src/test-vectors/signoff";

/** Core (`uk-tax.vectors.ts`) and E25 what-if (`uk-whatif.vectors.ts`) vectors are both accepted. */
type UkTaxVector = SignableVector;

const VECTOR_FILE_SIGNED_NULL = "signedOffBy: null,";

export function generateSheet(year: string, vectors: readonly UkTaxVector[]): string {
  const ys = vectors.filter((v) => v.taxYear === year);
  const lines = [
    `# Tax vector sign-off sheet: ${year}`,
    "",
    "Tick `[x]` only the vectors you have checked against the source. UNVERIFIED vectors also need a",
    "`ruling:` line (the written judgement call). Then run:",
    "",
    "```bash",
    `bun run tax:signoff apply --year ${year} --sheet <this file>`,
    "```",
    "",
    "Convention: takeHome vectors with children are net of the HICBC charge and exclude the Child Benefit received.",
    "",
    `${ys.length} vectors. Already signed ones are marked and skipped.`,
    "",
  ];
  for (const v of ys) {
    const signed = v.signedOffBy !== null;
    lines.push(
      `- [${signed ? "x" : " "}] \`${v.id}\` ${v.kind} ${v.region} ${JSON.stringify(v.input)} => ${v.expected}${signed ? " (already signed)" : ""}`,
      `  - source: ${v.source}`,
      `  - derivation: ${v.derivation.replace(/\s+/g, " ").trim()}`,
    );
    if (v.status === "UNVERIFIED") {
      lines.push(`  - ${v.unverifiedReason ?? "UNVERIFIED"}`, "  - ruling: ");
    }
  }
  return `${lines.join("\n")}\n`;
}

export interface Ticked {
  id: string;
  ruling?: string;
}

export function parseTicked(sheet: string): Ticked[] {
  const out: Ticked[] = [];
  const rows = sheet.split("\n");
  for (let i = 0; i < rows.length; i++) {
    const m = /^- \[[xX]\] `([^`]+)`/.exec(rows[i] ?? "");
    if (!m?.[1]) continue;
    let ruling: string | undefined;
    for (let j = i + 1; j < rows.length && !(rows[j] ?? "").startsWith("- ["); j++) {
      const r = /^\s+- ruling:\s*(.+)$/.exec(rows[j] ?? "");
      if (r?.[1]?.trim()) ruling = r[1].trim();
    }
    out.push({ id: m[1], ...(ruling ? { ruling } : {}) });
  }
  return out;
}

export interface ApplyResult {
  text: string;
  signed: string[];
  skipped: { id: string; reason: string }[];
}

/** Rewrites the vectors source text, setting sign-off fields for ticked, not-yet-signed vectors. */
export function applySignoff(
  fileText: string,
  year: string,
  ticked: readonly Ticked[],
  vectors: readonly UkTaxVector[],
  isoDate: string,
): ApplyResult {
  let text = fileText;
  const signed: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const { id, ruling } of ticked) {
    const v = vectors.find((x) => x.id === id);
    if (!v) {
      skipped.push({ id, reason: "unknown vector id" });
      continue;
    }
    if (v.taxYear !== year) {
      skipped.push({ id, reason: `belongs to ${v.taxYear}, not ${year}` });
      continue;
    }
    if (v.signedOffBy !== null) {
      skipped.push({ id, reason: "already signed" });
      continue;
    }
    if (v.status === "UNVERIFIED" && !ruling) {
      skipped.push({ id, reason: "UNVERIFIED: needs a ruling: line" });
      continue;
    }
    const at = text.indexOf(`id: "${id}",`);
    const spot = at === -1 ? -1 : text.indexOf(VECTOR_FILE_SIGNED_NULL, at);
    if (spot === -1) {
      skipped.push({ id, reason: "could not find it in the vectors file" });
      continue;
    }
    const indent = "    ";
    const block = [
      `signedOffBy: "${SIGNOFF_OWNER}",`,
      `${indent}signedOffAt: "${isoDate}",`,
      `${indent}signedOffHash: "${vectorSignoffHash(v)}",`,
      ...(ruling ? [`${indent}rulingRef: ${JSON.stringify(ruling)},`] : []),
    ].join("\n");
    text = text.slice(0, spot) + block + text.slice(spot + VECTOR_FILE_SIGNED_NULL.length);
    signed.push(id);
  }
  return { text, signed, skipped };
}
