import {
  CONTRACT_GROUPS,
  checkAgainst,
  findRoute,
  type RouteDefinition,
  type ValidationIssue,
} from "@flump/api-contract";
import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";

export type ContractMode = "off" | "shadow" | "enforce";

/**
 * `CONTRACT_MODE=off` disables the check, `enforce` rejects invalid requests with 400 (see
 * `CONTRACT_ENFORCE_GROUPS`). Anything else, including unset, is shadow mode: log only.
 */
export const resolveContractMode = (env: NodeJS.ProcessEnv = process.env): ContractMode => {
  const mode = env.CONTRACT_MODE?.trim().toLowerCase();
  return mode === "off" ? "off" : mode === "enforce" ? "enforce" : "shadow";
};

/**
 * Groups held back from the default enforce set until web and contract agree:
 * - mcp-tokens: the token card sends `expiryDays: null` for "never expires" (E17 D5-A).
 * - tax: receipt uploads accept `image/*` but the contract allows png, jpeg, webp and pdf only
 *   (HEIC photos would 400), and copying a 29 Feb record into a non-leap year yields an invalid date.
 * Drop an entry once its mismatch is fixed.
 */
export const HELD_BACK_GROUPS: readonly string[] = ["mcp-tokens", "tax"];

/**
 * Groups enforced when the mode is `enforce`: `CONTRACT_ENFORCE_GROUPS` is a comma-separated list
 * of contract groups (for example `accounts,budget`) so rollout can go one group at a time.
 * `all` enforces every group. Unset enforces every group except HELD_BACK_GROUPS. Unknown names
 * are ignored, so a typo enforces less, not more.
 */
export const resolveEnforcedGroups = (
  env: NodeJS.ProcessEnv = process.env,
): Set<string> | "all" => {
  const raw = env.CONTRACT_ENFORCE_GROUPS?.trim().toLowerCase();
  if (raw === "all") return "all";
  if (!raw) return new Set(CONTRACT_GROUPS.filter((group) => !HELD_BACK_GROUPS.includes(group)));
  const known = new Set<string>(CONTRACT_GROUPS);
  return new Set(
    raw
      .split(",")
      .map((name) => name.trim())
      .filter((name) => known.has(name)),
  );
};

const MAX_ISSUES_LOGGED = 20;
const MAX_PATH_CHARS = 80;

/** Log the 1st, 2nd and 10th occurrence per route, then every 100th, so a bad client cannot flood the log. */
export const shouldLogOccurrence = (count: number): boolean =>
  count === 1 || count === 2 || count === 10 || (count >= 100 && count % 100 === 0);

export interface ContractViolation {
  event: "contract_violation";
  routeId: string;
  method: string;
  pathTemplate: string;
  part: "params" | "query" | "body";
  issues: ValidationIssue[];
  /** Violations seen for this route since the process started. */
  count: number;
}

interface RequestLike {
  method?: string;
  route?: { path?: unknown };
  params?: unknown;
  query?: unknown;
  body?: unknown;
}

/**
 * Shadow-mode request validation (E21 section 5.1). Validates params, query and body against the
 * route's schema from `@flump/api-contract` and logs mismatches (paths and codes only, never
 * values). The original request is always passed through untouched and the interceptor never
 * throws, so client behaviour cannot change.
 */
@Injectable()
export class ContractShadowInterceptor implements NestInterceptor {
  private readonly logger = new Logger("ContractShadow");
  private readonly counts = new Map<string, number>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const mode = resolveContractMode();
    if (mode === "off" || context.getType() !== "http") return next.handle();
    let blocking: ValidationIssue[] = [];
    let enforced = false;
    let rejectedRoute: RouteDefinition | undefined;
    try {
      const result = this.check(context.switchToHttp().getRequest<RequestLike>());
      if (mode === "enforce" && result) {
        const groups = resolveEnforcedGroups();
        enforced = groups === "all" || groups.has(result.group);
        blocking = result.blocking;
        rejectedRoute = result.route;
      }
    } catch (error) {
      // A bug in the checker must never affect the request.
      this.logger.warn(`contract check failed: ${error instanceof Error ? error.name : "error"}`);
    }
    if (enforced && blocking.length > 0) {
      // Paths and codes only, never values. Unknown keys never block: the web sends fields the
      // backend drops (E21 section 5.3) and they are stripped, not rejected.
      // Own log line so the 400 rate can be watched when enforcement is switched on.
      this.logger.warn(
        JSON.stringify({
          event: "contract_rejected",
          method: rejectedRoute?.method,
          pathTemplate: rejectedRoute ? `/${rejectedRoute.path}` : undefined,
          routeId: rejectedRoute?.id,
          issues: blocking.slice(0, MAX_ISSUES_LOGGED),
        }),
      );
      throw new BadRequestException({
        statusCode: 400,
        error: "Bad Request",
        message: "Request failed validation",
        issues: blocking.slice(0, MAX_ISSUES_LOGGED),
      });
    }
    return next.handle();
  }

  private check(
    req: RequestLike,
  ): { group: string; route: RouteDefinition; blocking: ValidationIssue[] } | null {
    const path = typeof req.route?.path === "string" ? req.route.path.replace(/^\//, "") : null;
    if (path === null || !req.method) return null;
    const route = findRoute(req.method.toUpperCase(), path);
    if (!route) return null;
    const blocking = [
      ...this.validate(route, "params", route.params, req.params),
      ...this.validate(route, "query", route.query, req.query),
      ...this.validate(route, "body", route.body, req.body ?? {}),
    ];
    return { group: route.group, route, blocking };
  }

  private validate(
    route: RouteDefinition,
    part: ContractViolation["part"],
    schema: RouteDefinition["params"],
    value: unknown,
  ): ValidationIssue[] {
    if (!schema) return [];
    const result = checkAgainst(schema, value);
    if (result.ok) return [];
    const blocking = result.issues
      .filter((issue) => issue.code !== "unrecognized_keys")
      .map((issue) => ({
        path: `${part}${issue.path === "(root)" ? "" : `.${issue.path}`}`.slice(0, MAX_PATH_CHARS),
        code: issue.code,
      }));
    const count = (this.counts.get(route.id) ?? 0) + 1;
    this.counts.set(route.id, count);
    if (!shouldLogOccurrence(count)) return blocking;
    const violation: ContractViolation = {
      event: "contract_violation",
      routeId: route.id,
      method: route.method,
      pathTemplate: `/${route.path}`,
      part,
      issues: result.issues
        .slice(0, MAX_ISSUES_LOGGED)
        .map((issue) => ({ ...issue, path: issue.path.slice(0, MAX_PATH_CHARS) })),
      count,
    };
    this.logger.warn(JSON.stringify(violation));
    return blocking;
  }
}
