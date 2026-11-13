/**
 * Route matrix for the authorisation proof (E20-N22). Every route the AppModule registers has a
 * row here; route-coverage.spec.ts fails on a route with no row and on a row with no route.
 *
 * - "covered": exercised by the named spec, which records each route it ran and compares that
 *   set with the matrix, so a row cannot claim coverage the spec does not give.
 * - "pending": the IDOR cases land in the named ticket.
 * - "public": no AuthGuard by design (UNGUARDED_ALLOWLIST below is enforced separately).
 *
 * Keys are "METHOD /path" with Nest's `:param` syntax.
 */
export type MatrixRow =
  | { status: "covered"; spec: "finance" | "budget" }
  | { status: "pending"; ticket: "N23"; note: string }
  | { status: "public"; reason: string; spec?: "mcp" };

const finance = { status: "covered", spec: "finance" } as const;
const budget = { status: "covered", spec: "budget" } as const;
const pending = (note: string) => ({ status: "pending", ticket: "N23", note }) as const;
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

  // Tax, user-profile and mcp-tokens: pending N23.
  "GET /tax-records": pending("tax controller"),
  "GET /tax-records/:id": pending("tax controller"),
  "POST /tax-records/bulk": pending("tax controller, capPreviousRecordIds across users"),
  "POST /tax-records": pending("tax controller"),
  "PATCH /tax-records/:id": pending("tax controller"),
  "DELETE /tax-records/:id": pending("tax controller"),
  "GET /user-profile": pending("user-profile controller"),
  "PATCH /user-profile": pending("user-profile controller"),
  "POST /user-profile/send-password-reset": pending("user-profile controller"),
  "POST /user-profile/reset-financial-data": pending("user-profile controller"),
  "PATCH /user-profile/checklist": pending("user-profile controller"),
  "GET /mcp-tokens": pending("mcp-tokens"),
  "POST /mcp-tokens": pending("mcp-tokens"),
  "DELETE /mcp-tokens/:id": pending("mcp-tokens"),
  "GET /mcp-tokens/context-pack": pending("mcp-tokens"),
};

/** Routes allowed to carry no AuthGuard. Anything else without one fails the meta-test. */
export const UNGUARDED_ALLOWLIST: readonly string[] = [
  "GET /",
  "GET /health",
  "GET /health/ready",
  "GET /mcp",
  "POST /mcp",
];
