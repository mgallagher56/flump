import { describe, expect, it } from "vitest";
import {
  evaluateSignoff,
  isValidSigner,
  signVector,
  vectorSignoffHash,
  vectorSignoffHashV1,
  yearVerification,
} from "./signoff.js";
import { UK_SELF_ASSESSMENT_VECTORS } from "./uk-self-assessment.vectors.js";
import { UK_TAX_VECTORS, type UkTaxVector } from "./uk-tax.vectors.js";
import { UK_WHATIF_VECTORS } from "./uk-whatif.vectors.js";

const base = UK_TAX_VECTORS.find(
  (v) => v.status === "VERIFIED" && v.signedOffBy === null,
) as UkTaxVector;
const unverified = UK_TAX_VECTORS.find(
  (v) => v.status === "UNVERIFIED" && v.signedOffBy === null,
) as UkTaxVector;
const sign = (v: UkTaxVector, signer = "fable-decider", ruling?: string): UkTaxVector =>
  signVector(v, signer, "2026-12-01", ruling);

describe("sha256", () => {
  it("matches node:crypto for the v1 canonical string", async () => {
    const { createHash } = await import("node:crypto");
    for (const v of UK_TAX_VECTORS.slice(0, 5)) {
      const canonical = [
        v.id,
        v.taxYear,
        v.region,
        v.kind,
        JSON.stringify(
          Object.keys(v.input)
            .sort()
            .map((k) => [k, v.input[k]]),
        ),
        v.expected,
        v.source,
      ].join("|");
      expect(vectorSignoffHashV1(v)).toBe(createHash("sha256").update(canonical).digest("hex"));
    }
  });
  it("v2 is 'v2:' plus the sha256 of the JSON list of v1 fields, signer, status, ruling and reason", async () => {
    const { createHash } = await import("node:crypto");
    const v = sign(unverified, "fable-decider", "R1");
    const canonical = JSON.stringify([
      "v2",
      v.id,
      v.taxYear,
      v.region,
      v.kind,
      JSON.stringify(
        Object.keys(v.input)
          .sort()
          .map((k) => [k, v.input[k]]),
      ),
      v.expected,
      v.source,
      "fable-decider",
      "UNVERIFIED",
      "R1",
      v.unverifiedReason ?? "",
    ]);
    expect(v.signedOffHash).toBe(`v2:${createHash("sha256").update(canonical).digest("hex")}`);
    expect(vectorSignoffHash(v)).toBe(v.signedOffHash);
  });
});

describe("vector sign-off", () => {
  it("an unsigned vector is unsigned", () => {
    expect(evaluateSignoff(base)).toEqual({ state: "unsigned" });
  });
  it("a v2-signed vector is signed, with the signer written exactly as given", () => {
    const v = sign(base);
    expect(v.signedOffBy).toBe("fable-decider");
    expect(v.signedOffHash).toMatch(/^v2:[0-9a-f]{64}$/);
    expect(evaluateSignoff(v)).toEqual({ state: "signed" });
    expect(evaluateSignoff(sign(base, "owner"))).toEqual({ state: "signed" });
    expect(isValidSigner("fable-decider")).toBe(true);
    expect(isValidSigner("a")).toBe(true);
    expect(isValidSigner("a".repeat(64))).toBe(true);
  });

  const MISMATCH = {
    state: "invalid",
    reason: "vector changed after sign-off (hash mismatch): sign it off again",
  };
  it("a v2 signature fails when the signer, status, ruling, reason or expected value is edited", () => {
    const v = sign(unverified, "fable-decider", "R1");
    expect(evaluateSignoff(v)).toEqual({ state: "signed" });
    expect(evaluateSignoff({ ...v, signedOffBy: "owner" })).toEqual(MISMATCH);
    expect(evaluateSignoff({ ...v, status: "VERIFIED" })).toEqual(MISMATCH);
    expect(evaluateSignoff({ ...v, rulingRef: "R2" })).toEqual(MISMATCH);
    expect(evaluateSignoff({ ...v, unverifiedReason: "UNVERIFIED: something else" })).toEqual(
      MISMATCH,
    );
    expect(evaluateSignoff({ ...v, expected: v.expected + 1 })).toEqual(MISMATCH);
    // Deleting the ruling is caught too: the UNVERIFIED check or the hash, whichever comes first.
    expect(evaluateSignoff({ ...v, rulingRef: undefined }).state).toBe("invalid");
  });
  it("a v1 signature (no v2: marker) still validates for the owner", () => {
    const v1 = {
      ...base,
      signedOffBy: "owner",
      signedOffAt: "2026-11-20",
      signedOffHash: vectorSignoffHashV1(base),
    };
    expect(evaluateSignoff(v1)).toEqual({ state: "signed" });
    expect(evaluateSignoff({ ...v1, expected: base.expected + 1 })).toEqual(MISMATCH);
  });
  it("a v1 signature is valid only with signedOffBy owner, so the signer cannot be edited", () => {
    const v1 = {
      ...base,
      signedOffBy: "fable-decider",
      signedOffAt: "2026-11-20",
      signedOffHash: vectorSignoffHashV1(base),
    };
    expect(evaluateSignoff(v1)).toEqual({
      state: "invalid",
      reason: 'a signature without the v2: marker is valid only for signedOffBy "owner"',
    });
  });
  it("rejects a signer name that is empty, padded, too long or not a plain name", () => {
    for (const bad of ["", " owner", "owner ", "-x", "a b", 'x"y', "a\nb", "a".repeat(65)]) {
      expect(isValidSigner(bad), JSON.stringify(bad)).toBe(false);
      expect(evaluateSignoff({ ...sign(base), signedOffBy: bad }), bad).toEqual({
        state: "invalid",
        reason: "signedOffBy must be a signer name, such as fable-decider",
      });
    }
  });
  it("rejects a bad date, a missing hash and stray fields", () => {
    expect(evaluateSignoff({ ...sign(base), signedOffAt: "yesterday" }).state).toBe("invalid");
    expect(evaluateSignoff({ ...sign(base), signedOffHash: undefined }).state).toBe("invalid");
    expect(evaluateSignoff({ ...base, signedOffAt: "2026-12-01" }).state).toBe("invalid");
  });
  it("an UNVERIFIED vector needs a rulingRef", () => {
    expect(evaluateSignoff(sign(unverified))).toEqual({
      state: "invalid",
      reason: "an UNVERIFIED vector can only be signed with a rulingRef",
    });
    expect(evaluateSignoff(sign(unverified, "fable-decider", "a ruling")).state).toBe("signed");
  });
  it("a year is verified only when every vector is signed", () => {
    const year = base.taxYear;
    const only = UK_TAX_VECTORS.filter((v) => v.taxYear === year);
    expect(yearVerification(year, only)).toBe("unverified");
    expect(yearVerification(year, [])).toBe("unverified");
    const all = only.map((v) => (v.signedOffBy === null ? sign(v, "fable-decider", "r") : v));
    expect(yearVerification(year, all)).toBe("verified");
  });
  it("every committed signature validates, the owner's v1 2027/28 ones included", () => {
    // The hash is unkeyed: this catches an edit made after signing, not a signature someone
    // computed by hand. That is caught in review, by the vector diff and its baseline diff.
    for (const v of UK_TAX_VECTORS) expect(evaluateSignoff(v).state, v.id).not.toBe("invalid");
    expect(UK_TAX_VECTORS.some((v) => v.signedOffBy === "owner")).toBe(true);
  });

  it("a v1 signature dated after 20 Nov 2026 is invalid: the owner stopped signing that day", () => {
    const v1 = (at: string): UkTaxVector => ({
      ...base,
      signedOffBy: "owner",
      signedOffAt: at,
      signedOffHash: vectorSignoffHashV1(base),
    });
    expect(evaluateSignoff(v1("2026-11-20")).state).toBe("signed");
    expect(evaluateSignoff(v1("2026-11-21")).state).toBe("invalid");
  });

  it("the committed v1 (owner) signatures are exactly the owner's 37 from 20 Nov 2026", () => {
    // A new v1 signature cannot slip in: the owner's rule of 20 Nov 2026 ended owner sign-off,
    // and every later signature is v2. Changing this count is a guard change (AGENTS.md s.15).
    const v1Signed = [
      ...UK_TAX_VECTORS,
      ...UK_SELF_ASSESSMENT_VECTORS,
      ...UK_WHATIF_VECTORS,
    ].filter((v) => v.signedOffBy !== null && !v.signedOffHash?.startsWith("v2:"));
    expect(v1Signed).toHaveLength(37);
    expect(v1Signed.every((v) => v.signedOffBy === "owner" && v.taxYear === "2027/28")).toBe(true);
  });
});
