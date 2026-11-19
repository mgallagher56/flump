import { describe, expect, it } from "vitest";
import { encryptBankingToken, keyringFromSecret } from "./crypto.js";
import {
  createOAuthStateRecord,
  hashOAuthState,
  MAX_OAUTH_STATE_LENGTH,
  OAUTH_STATE_TTL_MS,
  pkceChallengeFromVerifier,
  verifyOAuthStateRecord,
  withPkceChallenge,
} from "./oauth-state.js";

const KEY_A = "a".repeat(32);
const KEY_B = "b".repeat(32);
const RING_A = keyringFromSecret(KEY_A, 1);
const RING_B = keyringFromSecret(KEY_B, 1);

describe("OAuth state & PKCE (M4, database-free)", () => {
  it("generates a 256-bit random state and PKCE S256 challenge without leaking user or bank ids", () => {
    const now = new Date("2026-11-16T00:00:00.000Z");
    const first = createOAuthStateRecord({
      userId: "user-secret-123",
      institutionId: "Monzo",
      redirectUri: "https://api.flump.test/bank-connections/callback",
      now,
      keyring: RING_A,
    });
    const second = createOAuthStateRecord({
      userId: "user-secret-123",
      institutionId: "Monzo",
      redirectUri: "https://api.flump.test/bank-connections/callback",
      now,
      keyring: RING_A,
    });

    expect(first.issued.state).not.toBe(second.issued.state);
    expect(first.issued.codeChallenge).not.toBe(second.issued.codeChallenge);
    expect(first.issued.state).not.toContain("user-secret-123");
    expect(first.issued.state.toLowerCase()).not.toContain("monzo");
    // 32 random bytes in base64url is 43 characters.
    expect(first.issued.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.issued.codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // Record stores only the SHA-256 hex digest of state and normalizes institutionId to lowercase.
    expect(first.record.stateHash).toBe(hashOAuthState(first.issued.state));
    expect(first.record.stateHash).not.toContain(first.issued.state);
    expect(first.record.institutionId).toBe("monzo");
    expect(first.record.encryptedCodeVerifier).toMatch(/^v1:/);
    expect(first.record.expiresAt.getTime()).toBe(now.getTime() + OAUTH_STATE_TTL_MS);
  });

  it("verifies a valid state and decrypts the PKCE code verifier matching the S256 challenge", () => {
    const now = new Date("2026-11-16T00:00:00.000Z");
    const { issued, record } = createOAuthStateRecord({
      userId: "user-1",
      institutionId: "Starling",
      redirectUri: "https://api.flump.test/cb",
      now,
      keyring: RING_A,
    });

    const consumed = verifyOAuthStateRecord(record, {
      state: issued.state,
      institutionId: "STARLING",
      now: new Date(now.getTime() + 60_000),
      keyring: RING_A,
    });

    expect(consumed).not.toBeNull();
    expect(consumed).toMatchObject({
      userId: "user-1",
      institutionId: "starling",
      redirectUri: "https://api.flump.test/cb",
    });
    expect(pkceChallengeFromVerifier(consumed?.codeVerifier ?? "")).toBe(issued.codeChallenge);
  });

  it("refuses expired states at and after the 10-minute TTL boundary", () => {
    const now = new Date("2026-11-16T00:00:00.000Z");
    const { issued, record } = createOAuthStateRecord({
      userId: "user-1",
      institutionId: "monzo",
      redirectUri: "https://api.flump.test/cb",
      now,
      keyring: RING_A,
    });

    // 1ms before expiry -> valid
    expect(
      verifyOAuthStateRecord(record, {
        state: issued.state,
        institutionId: "monzo",
        now: new Date(now.getTime() + OAUTH_STATE_TTL_MS - 1),
        keyring: RING_A,
      }),
    ).not.toBeNull();

    // Exact expiry -> refused
    expect(
      verifyOAuthStateRecord(record, {
        state: issued.state,
        institutionId: "monzo",
        now: new Date(now.getTime() + OAUTH_STATE_TTL_MS),
        keyring: RING_A,
      }),
    ).toBeNull();

    // After expiry -> refused
    expect(
      verifyOAuthStateRecord(record, {
        state: issued.state,
        institutionId: "monzo",
        now: new Date(now.getTime() + OAUTH_STATE_TTL_MS + 60_000),
        keyring: RING_A,
      }),
    ).toBeNull();

    // Invalid Date (NaN) -> refused
    expect(
      verifyOAuthStateRecord(
        { ...record, expiresAt: new Date("not-a-date") },
        {
          state: issued.state,
          institutionId: "monzo",
          now,
          keyring: RING_A,
        },
      ),
    ).toBeNull();
  });

  it("refuses a state presented for a different institution", () => {
    const now = new Date("2026-11-16T00:00:00.000Z");
    const { issued, record } = createOAuthStateRecord({
      userId: "user-1",
      institutionId: "monzo",
      redirectUri: "https://api.flump.test/cb",
      now,
      keyring: RING_A,
    });

    expect(
      verifyOAuthStateRecord(record, {
        state: issued.state,
        institutionId: "starling",
        now,
        keyring: RING_A,
      }),
    ).toBeNull();
  });

  it("refuses empty, oversized, missing, or tampered state values and tampered ciphertexts", () => {
    const now = new Date("2026-11-16T00:00:00.000Z");
    const first = createOAuthStateRecord({
      userId: "user-1",
      institutionId: "monzo",
      redirectUri: "https://api.flump.test/cb",
      now,
      keyring: RING_A,
    });
    const second = createOAuthStateRecord({
      userId: "user-2",
      institutionId: "monzo",
      redirectUri: "https://api.flump.test/cb",
      now,
      keyring: RING_A,
    });

    // Missing record or malformed state inputs
    expect(
      verifyOAuthStateRecord(null, {
        state: first.issued.state,
        institutionId: "monzo",
        now,
        keyring: RING_A,
      }),
    ).toBeNull();
    expect(
      verifyOAuthStateRecord(first.record, {
        state: "",
        institutionId: "monzo",
        now,
        keyring: RING_A,
      }),
    ).toBeNull();
    expect(
      verifyOAuthStateRecord(first.record, {
        state: "x".repeat(MAX_OAUTH_STATE_LENGTH + 1),
        institutionId: "monzo",
        now,
        keyring: RING_A,
      }),
    ).toBeNull();

    // Tampered state string does not match stored stateHash
    const flippedState = `${first.issued.state.slice(0, -1)}${
      first.issued.state.endsWith("A") ? "B" : "A"
    }`;
    expect(
      verifyOAuthStateRecord(first.record, {
        state: flippedState,
        institutionId: "monzo",
        now,
        keyring: RING_A,
      }),
    ).toBeNull();

    // Tampered encryptedCodeVerifier ciphertext is rejected
    const ct = first.record.encryptedCodeVerifier;
    const tamperedCt = `${ct.slice(0, -2)}${ct.endsWith("ff") ? "00" : "ff"}`;
    expect(
      verifyOAuthStateRecord(
        { ...first.record, encryptedCodeVerifier: tamperedCt },
        {
          state: first.issued.state,
          institutionId: "monzo",
          now,
          keyring: RING_A,
        },
      ),
    ).toBeNull();

    // Swapping encryptedCodeVerifier from another state record fails AAD check (bound to stateHash)
    expect(
      verifyOAuthStateRecord(
        { ...first.record, encryptedCodeVerifier: second.record.encryptedCodeVerifier },
        {
          state: first.issued.state,
          institutionId: "monzo",
          now,
          keyring: RING_A,
        },
      ),
    ).toBeNull();

    // Wrong keyring fails decryption and returns null without throwing
    expect(
      verifyOAuthStateRecord(first.record, {
        state: first.issued.state,
        institutionId: "monzo",
        now,
        keyring: RING_B,
      }),
    ).toBeNull();
  });

  it("appends PKCE S256 parameters to the provider authorization URL", () => {
    const url = withPkceChallenge(
      "https://auth.monzo.test/oauth?client_id=cid&state=st-1",
      "challenge-xyz",
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get("client_id")).toBe("cid");
    expect(parsed.searchParams.get("state")).toBe("st-1");
    expect(parsed.searchParams.get("code_challenge")).toBe("challenge-xyz");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
  });
});

describe("verifyOAuthStateRecord input checks", () => {
  const now = new Date("2026-11-16T00:00:00.000Z");

  /** A record that matches `state` in every way, so only the input checks can refuse it. */
  function recordFor(state: string, encryptedCodeVerifier?: string) {
    const stateHash = hashOAuthState(state);
    return {
      userId: "user-1",
      institutionId: "monzo",
      stateHash,
      encryptedCodeVerifier:
        encryptedCodeVerifier ??
        encryptBankingToken("verifier-value", { aad: stateHash, keyring: RING_A }),
      redirectUri: "https://api.flump.test/cb",
      expiresAt: new Date(now.getTime() + OAUTH_STATE_TTL_MS),
    };
  }

  const verify = (record: ReturnType<typeof recordFor>, state: unknown) =>
    verifyOAuthStateRecord(record, {
      state: state as string,
      institutionId: "monzo",
      now,
      keyring: RING_A,
    });

  it("accepts a state of exactly the maximum length", () => {
    const state = "s".repeat(MAX_OAUTH_STATE_LENGTH);
    expect(verify(recordFor(state), state)?.codeVerifier).toBe("verifier-value");
  });

  it("refuses a state one character over the maximum, even with a matching record", () => {
    const state = "s".repeat(MAX_OAUTH_STATE_LENGTH + 1);
    expect(verify(recordFor(state), state)).toBeNull();
  });

  it("refuses an empty state, even with a matching record", () => {
    expect(verify(recordFor(""), "")).toBeNull();
  });

  it("returns null, without throwing, for a state that is not a string", () => {
    // A repeated query parameter can arrive as an array.
    const record = recordFor("abc");
    expect(verify(record, ["abc"])).toBeNull();
  });

  it("returns null, without throwing, when the stored hash has another length", () => {
    // The verifier is bound to the stored hash, so only the hash comparison can refuse it.
    const verifier = encryptBankingToken("verifier-value", { aad: "ab", keyring: RING_A });
    const record = { ...recordFor("abc", verifier), stateHash: "ab" };
    expect(verify(record, "abc")).toBeNull();
  });

  it("refuses a record whose code verifier is empty", () => {
    expect(verify(recordFor("abc", ""), "abc")).toBeNull();
  });
});
