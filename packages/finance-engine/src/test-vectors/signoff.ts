/**
 * Sign-off validation for UK tax vectors (E22). The owner is the only signer.
 * Pure (own sha256, no Node types needed): used by tests and scripts/tax-signoff.ts, never by app code.
 */
import type { UkTaxVector } from "./uk-tax.vectors.js";

/**
 * Anything with the vector fields the sign-off covers: the core catalogue (`UkTaxVector`) and the E25
 * what-if catalogue (`UkWhatIfVector`, other `kind` values) both qualify.
 */
export type SignableVector = Omit<UkTaxVector, "kind"> & { kind: string };

export const SIGNOFF_OWNER = "owner";

function stableInput(input: UkTaxVector["input"]): string {
  return JSON.stringify(
    Object.keys(input)
      .sort()
      .map((k) => [k, input[k]]),
  );
}

/** Hash of everything that gives a vector its meaning. Changing any of it invalidates a sign-off. */
export function vectorSignoffHash(v: SignableVector): string {
  const canonical = [
    v.id,
    v.taxYear,
    v.region,
    v.kind,
    stableInput(v.input),
    v.expected,
    v.source,
  ].join("|");
  return sha256Hex(canonical);
}

export type SignoffState =
  | { state: "unsigned" }
  | { state: "signed" }
  | { state: "invalid"; reason: string };

export function evaluateSignoff(v: SignableVector): SignoffState {
  if (v.signedOffBy === null) {
    if (v.signedOffAt !== undefined || v.signedOffHash !== undefined) {
      return { state: "invalid", reason: "signedOffAt/signedOffHash set without signedOffBy" };
    }
    return { state: "unsigned" };
  }
  if (v.signedOffBy !== SIGNOFF_OWNER) {
    return { state: "invalid", reason: `signedOffBy must be "${SIGNOFF_OWNER}"` };
  }
  if (
    !v.signedOffAt ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v.signedOffAt) ||
    Number.isNaN(Date.parse(v.signedOffAt))
  ) {
    return { state: "invalid", reason: "signedOffAt must be an ISO date (YYYY-MM-DD)" };
  }
  if (v.signedOffHash !== vectorSignoffHash(v)) {
    return {
      state: "invalid",
      reason: "vector changed after sign-off (hash mismatch): sign it off again",
    };
  }
  if (v.status === "UNVERIFIED" && !v.rulingRef) {
    return { state: "invalid", reason: "an UNVERIFIED vector can only be signed with a rulingRef" };
  }
  return { state: "signed" };
}

/** "verified" only when every vector for the year is validly signed (no vectors = unverified). */
export function yearVerification(
  year: string,
  vectors: readonly SignableVector[],
): "verified" | "unverified" {
  const ys = vectors.filter((v) => v.taxYear === year);
  return ys.length > 0 && ys.every((v) => evaluateSignoff(v).state === "signed")
    ? "verified"
    : "unverified";
}

// Minimal sha256 (FIPS 180-4) over UTF-8, so this file needs neither node:crypto nor DOM types.
function sha256Hex(text: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const bytes: number[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0) as number;
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else
      bytes.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 63),
        0x80 | ((c >> 6) & 63),
        0x80 | (c & 63),
      );
  }
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const hi = Math.floor(bitLen / 0x100000000);
  for (const w of [hi, bitLen >>> 0])
    bytes.push(w >>> 24, (w >>> 16) & 255, (w >>> 8) & 255, w & 255);
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < bytes.length; o += 64) {
    const w = new Array<number>(64).fill(0);
    for (let i = 0; i < 16; i++) {
      w[i] =
        ((bytes[o + i * 4] as number) << 24) |
        ((bytes[o + i * 4 + 1] as number) << 16) |
        ((bytes[o + i * 4 + 2] as number) << 8) |
        (bytes[o + i * 4 + 3] as number);
    }
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15] as number;
      const b = w[i - 2] as number;
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[i] = ((w[i - 16] as number) + s0 + (w[i - 7] as number) + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    for (let i = 0; i < 64; i++) {
      const t1 =
        (hh +
          (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) +
          ((e & f) ^ (~e & g)) +
          (K[i] as number) +
          (w[i] as number)) |
        0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((v, i) => {
      h[i] = ((h[i] as number) + v) | 0;
    });
  }
  return h.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
}
