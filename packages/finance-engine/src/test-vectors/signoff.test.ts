import { describe, expect, it } from "vitest";
import { evaluateSignoff, isValidSigner, vectorSignoffHash, yearVerification } from "./signoff.js";
import { UK_TAX_VECTORS, type UkTaxVector } from "./uk-tax.vectors.js";

const base = UK_TAX_VECTORS.find((v) => v.status === "VERIFIED") as UkTaxVector;
const unverified = UK_TAX_VECTORS.find((v) => v.status === "UNVERIFIED") as UkTaxVector;
const sign = (v: UkTaxVector, extra: Partial<UkTaxVector> = {}): UkTaxVector => ({
  ...v,
  signedOffBy: "fable-decider",
  signedOffAt: "2026-12-01",
  signedOffHash: vectorSignoffHash(v),
  ...extra,
});

describe("sha256", () => {
  it("matches known digests (via the vector hash of a synthetic vector)", async () => {
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
      expect(vectorSignoffHash(v)).toBe(createHash("sha256").update(canonical).digest("hex"));
    }
  });
});

describe("vector sign-off", () => {
  it("an unsigned vector is unsigned", () => {
    expect(evaluateSignoff(base)).toEqual({ state: "unsigned" });
  });
  it("a correctly signed vector is signed", () => {
    expect(evaluateSignoff(sign(base))).toEqual({ state: "signed" });
  });
  it("editing a signed vector invalidates the sign-off", () => {
    const edited = { ...sign(base), expected: base.expected + 1 };
    expect(evaluateSignoff(edited).state).toBe("invalid");
  });
  it("accepts the decider and the owner as signers, written exactly as given", () => {
    expect(evaluateSignoff(sign(base, { signedOffBy: "fable-decider" }))).toEqual({
      state: "signed",
    });
    expect(evaluateSignoff(sign(base, { signedOffBy: "owner" }))).toEqual({ state: "signed" });
    expect(isValidSigner("fable-decider")).toBe(true);
    expect(isValidSigner("a")).toBe(true);
    expect(isValidSigner("a".repeat(64))).toBe(true);
  });
  it("rejects a signer name that is empty, padded, too long or not a plain name", () => {
    for (const bad of ["", " owner", "owner ", "-x", "a b", 'x"y', "a\nb", "a".repeat(65)]) {
      expect(isValidSigner(bad), JSON.stringify(bad)).toBe(false);
      expect(evaluateSignoff(sign(base, { signedOffBy: bad })).state, bad).toBe("invalid");
    }
  });
  it("rejects a bad date, a missing hash and stray fields", () => {
    expect(evaluateSignoff(sign(base, { signedOffAt: "yesterday" })).state).toBe("invalid");
    expect(evaluateSignoff(sign(base, { signedOffHash: undefined })).state).toBe("invalid");
    expect(evaluateSignoff({ ...base, signedOffAt: "2026-12-01" }).state).toBe("invalid");
  });
  it("an UNVERIFIED vector needs a rulingRef", () => {
    expect(evaluateSignoff(sign(unverified)).state).toBe("invalid");
    expect(evaluateSignoff(sign(unverified, { rulingRef: "DECISIONS round 3 #13" })).state).toBe(
      "signed",
    );
  });
  it("a year is verified only when every vector is signed", () => {
    const year = base.taxYear;
    const only = UK_TAX_VECTORS.filter((v) => v.taxYear === year);
    expect(yearVerification(year, only)).toBe("unverified");
    expect(yearVerification(year, [])).toBe("unverified");
    const all = only.map((v) => sign(v, { rulingRef: "r" }));
    expect(yearVerification(year, all)).toBe("verified");
  });
  it("every committed signature validates, the owner's 2027/28 ones included", () => {
    // A signature validates only if its hash matches the vector's current content, so an edit
    // made after signing, or a hand-written signature, fails here.
    for (const v of UK_TAX_VECTORS) expect(evaluateSignoff(v).state, v.id).not.toBe("invalid");
    expect(UK_TAX_VECTORS.some((v) => v.signedOffBy === "owner")).toBe(true);
  });
});
