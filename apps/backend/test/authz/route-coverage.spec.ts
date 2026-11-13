import { describe, expect, it } from "vitest";
import { ROUTE_MATRIX, UNGUARDED_ALLOWLIST } from "./matrix";
import { type RegisteredRoute, registeredRoutes } from "./routes";

/**
 * Meta-test for the authorisation proof (E20-N22). No database needed.
 *
 * Fails when a controller route has no matrix row (so new routes cannot ship without an authz
 * decision), when a matrix row names a route that no longer exists, and when a route has no
 * AuthGuard while not on the allow-list.
 */
describe("authz route coverage", () => {
  const routes = registeredRoutes();

  it("finds the routes (guards against an empty enumeration passing vacuously)", () => {
    expect(routes.length).toBeGreaterThan(30);
  });

  it("has a matrix row for every registered route", () => {
    const missing = routes.map((r) => r.key).filter((key) => !(key in ROUTE_MATRIX));
    expect(missing, `routes with no row in test/authz/matrix.ts: ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("has no matrix row for a route that does not exist", () => {
    const real = new Set(routes.map((r) => r.key));
    const stale = Object.keys(ROUTE_MATRIX).filter((key) => !real.has(key));
    expect(stale, `matrix rows with no route: ${stale.join(", ")}`).toEqual([]);
  });

  it("has no unguarded route outside the allow-list", () => {
    const unguarded = routes.filter((r) => !r.guarded).map((r) => r.key);
    const offenders = unguarded.filter((key) => !UNGUARDED_ALLOWLIST.includes(key));
    expect(offenders, `routes without AuthGuard: ${offenders.join(", ")}`).toEqual([]);
  });

  it("keeps the allow-list and the public rows identical, and never lists a guarded route", () => {
    const publicRows = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "public")
      .map(([key]) => key)
      .sort();
    expect([...UNGUARDED_ALLOWLIST].sort()).toEqual(publicRows);
    const guarded = new Set(routes.filter((r) => r.guarded).map((r) => r.key));
    expect(UNGUARDED_ALLOWLIST.filter((key) => guarded.has(key))).toEqual([]);
  });

  it("detects an unguarded route (self-test of the detector)", () => {
    const fake: RegisteredRoute[] = [{ key: "GET /secret", guarded: false }];
    const offenders = fake.filter((r) => !r.guarded && !UNGUARDED_ALLOWLIST.includes(r.key));
    expect(offenders).toHaveLength(1);
  });
});
