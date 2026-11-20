import { createHash } from "node:crypto";
import type { EntityManager } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { consumeOAuthState, issueOAuthState, withPkceChallenge } from "./bank-connection-oauth";

interface FakeStateRow {
  user_id: string;
  institution_id: string;
  state_hash: string;
  code_verifier: string;
  redirect_uri: string;
  expires_at: Date;
}

function createFakeOAuthStateManager() {
  const rows = new Map<string, FakeStateRow>();

  const manager = {
    query: async (sql: string, parameters?: unknown[]) => {
      const normalized = sql.replace(/\s+/g, " ").trim();
      if (normalized.startsWith('DELETE FROM "bank_oauth_states" WHERE "user_id" = $1')) {
        const [userId, now] = parameters as [string, Date];
        for (const [key, row] of rows.entries()) {
          if (row.user_id === userId && row.expires_at.getTime() <= now.getTime()) {
            rows.delete(key);
          }
        }
        return [[], 0];
      }
      if (normalized.startsWith('INSERT INTO "bank_oauth_states"')) {
        const [userId, institutionId, stateHash, codeVerifier, redirectUri, expiresAt] =
          parameters as [string, string, string, string, string, Date];
        rows.set(stateHash, {
          user_id: userId,
          institution_id: institutionId,
          state_hash: stateHash,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
          expires_at: expiresAt,
        });
        return [];
      }
      if (normalized.startsWith('DELETE FROM "bank_oauth_states" WHERE "state_hash" = $1')) {
        const [stateHash] = parameters as [string];
        const found = rows.get(stateHash);
        if (!found) return [[], 0];
        rows.delete(stateHash);
        return [[found], 1];
      }
      throw new Error(`Unexpected SQL in fake manager: ${normalized}`);
    },
  } as unknown as EntityManager;

  return { manager, rows };
}

describe("bank-connection-oauth (M4, database-free unit tests)", () => {
  const savedKey = process.env.BANKING_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.BANKING_TOKEN_ENCRYPTION_KEY = "k".repeat(40);
  });

  afterEach(() => {
    process.env.BANKING_TOKEN_ENCRYPTION_KEY = savedKey;
  });

  it("issues a random state and PKCE S256 challenge, stores only the hash, and consumes it once", async () => {
    const { manager, rows } = createFakeOAuthStateManager();
    const now = new Date("2026-11-16T12:00:00.000Z");

    const issued = await issueOAuthState(manager, {
      userId: "user-123",
      institutionId: "Monzo",
      redirectUri: "https://api.test/cb",
      now,
    });

    expect(issued.state).not.toContain("user-123");
    expect(rows.size).toBe(1);
    const [stored] = [...rows.values()];
    expect(stored?.state_hash).not.toBe(issued.state);
    expect(stored?.code_verifier).toMatch(/^v1:/);

    const consumed = await consumeOAuthState(manager, issued.state, "monzo", now);
    expect(consumed).toMatchObject({
      userId: "user-123",
      institutionId: "monzo",
      redirectUri: "https://api.test/cb",
    });
    const derivedChallenge = createHash("sha256")
      .update(consumed?.codeVerifier ?? "")
      .digest("base64url");
    expect(derivedChallenge).toBe(issued.codeChallenge);

    // Single-use: a replay returns null.
    expect(await consumeOAuthState(manager, issued.state, "monzo", now)).toBeNull();
  });

  it("refuses expired, mismatched-institution, tampered, or oversized states", async () => {
    const { manager, rows } = createFakeOAuthStateManager();
    const t0 = new Date("2026-11-16T12:00:00.000Z");

    const expired = await issueOAuthState(manager, {
      userId: "user-123",
      institutionId: "monzo",
      redirectUri: "https://api.test/cb",
      now: t0,
    });
    expect(
      await consumeOAuthState(
        manager,
        expired.state,
        "monzo",
        new Date(t0.getTime() + 10 * 60 * 1000),
      ),
    ).toBeNull();

    const wrongBank = await issueOAuthState(manager, {
      userId: "user-123",
      institutionId: "monzo",
      redirectUri: "https://api.test/cb",
      now: t0,
    });
    expect(await consumeOAuthState(manager, wrongBank.state, "starling", t0)).toBeNull();

    const tampered = await issueOAuthState(manager, {
      userId: "user-123",
      institutionId: "monzo",
      redirectUri: "https://api.test/cb",
      now: t0,
    });
    for (const row of rows.values()) {
      row.code_verifier = `${row.code_verifier.slice(0, -2)}${
        row.code_verifier.endsWith("ff") ? "00" : "ff"
      }`;
    }
    expect(await consumeOAuthState(manager, tampered.state, "monzo", t0)).toBeNull();

    expect(await consumeOAuthState(manager, "", "monzo", t0)).toBeNull();
    expect(await consumeOAuthState(manager, "x".repeat(129), "monzo", t0)).toBeNull();
  });

  it("refuses an empty or over-long state without touching the database", async () => {
    // States are 256 random bits; anything empty or longer than 128 characters cannot be one,
    // so it is refused before it is hashed or looked up. A manager that throws on any query
    // shows no lookup happens.
    const manager = {
      query: async () => {
        throw new Error("no query expected");
      },
    } as unknown as EntityManager;
    const t0 = new Date("2026-11-16T12:00:00.000Z");
    await expect(consumeOAuthState(manager, "", "monzo", t0)).resolves.toBeNull();
    await expect(consumeOAuthState(manager, "x".repeat(129), "monzo", t0)).resolves.toBeNull();
  });

  it("attaches PKCE S256 query parameters to an authorization URL", () => {
    const url = withPkceChallenge("https://auth.example.test/authorize?state=abc", "ch-1");
    expect(new URL(url).searchParams.get("code_challenge")).toBe("ch-1");
    expect(new URL(url).searchParams.get("code_challenge_method")).toBe("S256");
  });
});
