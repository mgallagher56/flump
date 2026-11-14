import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AUDIT_ACTIONS } from "../entities/audit-event.entity";
import { runWithRequestContext } from "../observability/request-context";
import { recordAuditEvent, sanitiseAuditMetadata } from "./audit-events";

function managerWith(insert = vi.fn().mockResolvedValue(undefined)) {
  return { manager: { getRepository: () => ({ insert }) } as never, insert };
}

describe("sanitiseAuditMetadata", () => {
  it("keeps allow-listed identifiers, flags, counts and identifier lists", () => {
    expect(
      sanitiseAuditMetadata({
        scopes: ["mcp:read:anonymized", "mcp:simulate"],
        expiryDays: 30,
        allowStaging: false,
        institutionId: "monzo",
        removed: { accounts: 2, transactions: 10 },
      }),
    ).toEqual({
      scopes: ["mcp:read:anonymized", "mcp:simulate"],
      expiryDays: 30,
      allowStaging: false,
      institutionId: "monzo",
      removed: ["accounts:2", "transactions:10"],
    });
  });

  it("drops unknown keys, free text, non-finite numbers and nested values", () => {
    expect(
      sanitiseAuditMetadata({
        name: "Rent to J Smith",
        email: "a@example.test",
        institutionId: "Monzo Bank <script>",
        expiryDays: Number.NaN,
        scopes: ["ok", "has spaces", { x: 1 }],
        removed: { accounts: 1.5, "bad key!": 1 },
      }),
    ).toEqual({ scopes: ["ok"], removed: [] });
  });
});

describe("recordAuditEvent", () => {
  it("writes one row with the request id from the request context", async () => {
    const { manager, insert } = managerWith();
    await runWithRequestContext({ requestId: "req-12345678" }, () =>
      recordAuditEvent(manager, {
        userId: "user_a",
        action: "mcp_token.minted",
        targetId: "00000000-0000-4000-8000-000000000001",
        metadata: { scopes: ["mcp:simulate"], tokenName: "secret name" },
      }),
    );
    expect(insert).toHaveBeenCalledWith({
      userId: "user_a",
      action: "mcp_token.minted",
      actorType: "user",
      targetId: "00000000-0000-4000-8000-000000000001",
      requestId: "req-12345678",
      metadata: { scopes: ["mcp:simulate"] },
    });
  });

  it("drops a target id that is not a uuid", async () => {
    const { manager, insert } = managerWith();
    await recordAuditEvent(manager, {
      userId: "u",
      action: "account.deleted",
      targetId: "x; drop",
    });
    expect(insert.mock.calls[0]?.[0]).toMatchObject({ targetId: null, requestId: null });
  });

  it("refuses an unknown action and a missing user id except for user.deleted", async () => {
    const { manager } = managerWith();
    await expect(
      recordAuditEvent(manager, { userId: "u", action: "made.up" as never }),
    ).rejects.toThrow(/Unknown audit action/);
    await expect(
      recordAuditEvent(manager, { userId: null, action: "account.deleted" }),
    ).rejects.toThrow(/without a user id/);
    await expect(
      recordAuditEvent(manager, { userId: null, action: "user.deleted" }),
    ).resolves.toBeUndefined();
  });

  it("propagates a failed write so the caller's transaction rolls back", async () => {
    const { manager } = managerWith(vi.fn().mockRejectedValue(new Error("db down")));
    await expect(
      recordAuditEvent(manager, { userId: "u", action: "mcp_token.revoked" }),
    ).rejects.toThrow("db down");
  });
});

/** Every production .ts file under src (no specs, no testing helpers). */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "testing" ? [] : sourceFiles(path);
    return name.endsWith(".ts") && !name.endsWith(".spec.ts") ? [path] : [];
  });
}

describe("audit coverage law (BE-06, H12)", () => {
  it("every audit action is written somewhere outside the entity and the helper", () => {
    const src = join(__dirname, "..");
    const callers = sourceFiles(src)
      .filter(
        (f) => !f.endsWith("audit-event.entity.ts") && !f.includes(`${join("src", "migrations")}`),
      )
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    const missing = AUDIT_ACTIONS.filter((a) => !callers.includes(`"${a}"`));
    expect(missing).toEqual([]);
  });
});
