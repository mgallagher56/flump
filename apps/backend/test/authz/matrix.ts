/**
 * Route matrix for the authorisation proof (E20-N22). Every route the AppModule registers has a
 * row here; route-coverage.spec.ts fails on a route with no row and on a row with no route.
 *
 * - "covered": exercised by the named spec, which records each route it ran and compares that
 *   set with the matrix, so a row cannot claim coverage the spec does not give.
 * - "public": no AuthGuard by design (UNGUARDED_ALLOWLIST below is enforced separately).
 *
 * Keys are "METHOD /path" with Nest's `:param` syntax.
 */
export type MatrixRow =
  | {
      status: "covered";
      spec: "finance" | "budget" | "tax" | "user-profile" | "mcp-tokens" | "snapshots" | "imports";
    }
  | { status: "public"; reason: string; spec?: "mcp" };

const finance = { status: "covered", spec: "finance" } as const;
const budget = { status: "covered", spec: "budget" } as const;
const tax = { status: "covered", spec: "tax" } as const;
const userProfile = { status: "covered", spec: "user-profile" } as const;
const mcpTokens = { status: "covered", spec: "mcp-tokens" } as const;
const snapshots = { status: "covered", spec: "snapshots" } as const;
const imports = { status: "covered", spec: "imports" } as const;
const mcpTransport = {
  status: "public",
  reason: "MCP transport, authenticates with a PAT itself (authz.mcp.spec.ts)",
  spec: "mcp",
} as const;

export const ROUTE_MATRIX: Readonly<Record<string, MatrixRow>> = {
  // Public by design.
  "GET /": { status: "public", reason: "app hello route" },
  "GET /health": { status: "public", reason: "liveness probe" },
  "GET /health/ready": { status: "public", reason: "readiness probe" },
  "GET /mcp": mcpTransport,
  "POST /mcp": mcpTransport,

  // Finance controller.
  "GET /accounts": finance,
  "GET /account-details": finance,
  "GET /accounts/:id": finance,
  "GET /accounts/:id/details": finance,
  "GET /portfolio-snapshot": finance,
  "POST /accounts": finance,
  "PUT /accounts/:id": finance,
  "PATCH /accounts/balances": finance,
  "PATCH /accounts/:id": finance,
  "DELETE /accounts/:id": finance,
  "GET /transactions": finance,
  "POST /transactions": finance,
  "GET /bank-connections": finance,
  "GET /bank-connections/capability": finance,
  "POST /bank-connections": finance,
  "POST /bank-connections/:id/refresh": finance,
  "POST /bank-connections/:id/sync": finance,
  "DELETE /bank-connections/:id": finance,

  // Budget controller.
  "GET /budget-entries": budget,
  "POST /budget-entries/seed-defaults": budget,
  "POST /budget-entries/categories": budget,
  "POST /budget-entries": budget,
  "PATCH /budget-entries/:id": budget,
  "DELETE /budget-entries/:id": budget,

  // Tax controller (E20-N23).
  "GET /tax-records": tax,
  "GET /tax-records/:id": tax,
  "GET /tax-records/:id/receipt": tax,
  "POST /tax-records/bulk": tax,
  "POST /tax-records": tax,
  "PATCH /tax-records/:id": tax,
  "DELETE /tax-records/:id": tax,

  // User-profile controller (E20-N23).
  "GET /user-profile": userProfile,
  "PATCH /user-profile": userProfile,
  "POST /user-profile/send-password-reset": userProfile,
  "POST /user-profile/reset-financial-data": userProfile,
  "PATCH /user-profile/checklist": userProfile,

  // Monthly snapshots (E30).
  "PUT /snapshots/:month": snapshots,

  // Import pipeline (E17 re-plan PR C).
  "POST /imports": imports,
  "GET /imports/:id": imports,
  "POST /imports/:id/commit": imports,
  "POST /imports/:id/revert": imports,

  // MCP token management (E20-N23). The /mcp transport itself is public, see above.
  "GET /mcp-tokens": mcpTokens,
  "POST /mcp-tokens": mcpTokens,
  "DELETE /mcp-tokens/:id": mcpTokens,
  "GET /mcp-tokens/context-pack": mcpTokens,
};

/** Routes allowed to carry no AuthGuard. Anything else without one fails the meta-test. */
export const UNGUARDED_ALLOWLIST: readonly string[] = [
  "GET /",
  "GET /health",
  "GET /health/ready",
  "GET /mcp",
  "POST /mcp",
];
