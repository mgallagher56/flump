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
import { type Observable, tap } from "rxjs";

export type ContractMode = "off" | "shadow" | "enforce";

/**
 * Enforce by default (E21 done): invalid requests get a 400 (see `CONTRACT_ENFORCE_GROUPS`).
 * `CONTRACT_MODE=shadow` logs only and `off` disables the check; both are escape hatches for an
 * incident, not a rollout state. An unrecognised value enforces, so a typo never turns it off.
 */
export const resolveContractMode = (env: NodeJS.ProcessEnv = process.env): ContractMode => {
  const mode = env.CONTRACT_MODE?.trim().toLowerCase();
  return mode === "off" ? "off" : mode === "shadow" ? "shadow" : "enforce";
};

/**
 * Groups held back from the default enforce set until web and contract agree. Empty now that the
 * MCP token card no longer offers "never expires" and the tax receipt, leap-day and decimal
 * mismatches are fixed on the web side. Add a group here to hold it back again.
 */
export const HELD_BACK_GROUPS: readonly string[] = [];

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

/**
 * Whether to check the `n`th response for a route. Outside production every response is checked
 * (the contract and authz suites rely on that). In production the first 20 per route per process
 * and then 1 in 50 are checked, so large bodies (transactions, the context pack) do not pay a
 * second serialisation and a full parse on every request.
 */
export const shouldCheckResponse = (n: number, env: NodeJS.ProcessEnv = process.env): boolean =>
  env.NODE_ENV !== "production" || n <= 20 || n % 50 === 0;

/** Log the 1st, 2nd and 10th occurrence per route, then every 100th, so a bad client cannot flood the log. */
export const shouldLogOccurrence = (count: number): boolean =>
  count === 1 || count === 2 || count === 10 || (count >= 100 && count % 100 === 0);

export interface ContractViolation {
  /** `contract_response_violation` when the backend's own 2xx body breaks the contract. */
  event: "contract_violation" | "contract_response_violation";
  routeId: string;
  method: string;
  pathTemplate: string;
  part: "params" | "query" | "body" | "response";
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
  private readonly responsesSeen = new Map<string, number>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const mode = resolveContractMode();
    if (mode === "off" || context.getType() !== "http") return next.handle();
    let blocking: ValidationIssue[] = [];
    let enforced = false;
    let rejectedRoute: RouteDefinition | undefined;
    let matched: RouteDefinition | undefined;
    try {
      const result = this.check(context.switchToHttp().getRequest<RequestLike>());
      matched = result?.route;
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
      // Own log line so the 400 rate can be watched when enforcement is switched on. Unsampled on
      // purpose (it is the rate meter), and it must never turn the 400 into a 500.
      try {
        this.logger.warn(
          JSON.stringify({
            event: "contract_rejected",
            method: rejectedRoute?.method,
            pathTemplate: rejectedRoute ? `/${rejectedRoute.path}` : undefined,
            routeId: rejectedRoute?.id,
            issues: blocking.slice(0, MAX_ISSUES_LOGGED),
          }),
        );
      } catch {
        // logging failure is ignored
      }
      throw new BadRequestException({
        statusCode: 400,
        error: "Bad Request",
        message: "Request failed validation",
        issues: blocking.slice(0, MAX_ISSUES_LOGGED),
      });
    }
    const responseSchema = matched?.response;
    if (!matched || !responseSchema) return next.handle();
    const route = matched;
    return next
      .handle()
      .pipe(tap({ next: (body) => this.checkResponse(route, responseSchema, body) }));
  }

  /**
   * Response-shape check (E21): logs `contract_response_violation`, paths and codes only. Never
   * changes or fails the response, whatever the mode: a backend bug must not become a 500 for the
   * user. The real-Postgres contract and authz suites fail on any of these lines instead.
   */
  private checkResponse(route: RouteDefinition, schema: RouteDefinition["params"], body: unknown) {
    try {
      if (!schema || body === undefined) return;
      const seen = (this.responsesSeen.get(route.id) ?? 0) + 1;
      this.responsesSeen.set(route.id, seen);
      if (!shouldCheckResponse(seen)) return;
      // What the client receives: dates become ISO strings, class instances plain objects.
      const wire: unknown = JSON.parse(JSON.stringify(body));
      this.validate(route, "response", schema, wire);
    } catch (error) {
      this.logger.warn(
        `contract response check failed: ${error instanceof Error ? error.name : "error"}`,
      );
    }
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
    const key = part === "response" ? `${route.id}:response` : route.id;
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    if (!shouldLogOccurrence(count)) return blocking;
    const violation: ContractViolation = {
      event: part === "response" ? "contract_response_violation" : "contract_violation",
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
