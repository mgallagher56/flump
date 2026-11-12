import {
  checkAgainst,
  findRoute,
  type RouteDefinition,
  type ValidationIssue,
} from "@flump/api-contract";
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";

export type ContractMode = "off" | "shadow";

/**
 * `CONTRACT_MODE=off` disables the check. Anything else (including unset) is shadow mode.
 * There is deliberately no enforce mode yet: E21 phase 1 only observes.
 */
export const resolveContractMode = (env: NodeJS.ProcessEnv = process.env): ContractMode =>
  env.CONTRACT_MODE?.trim().toLowerCase() === "off" ? "off" : "shadow";

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
    if (resolveContractMode() === "off" || context.getType() !== "http") return next.handle();
    try {
      this.check(context.switchToHttp().getRequest<RequestLike>());
    } catch (error) {
      // A bug in the checker must never affect the request.
      this.logger.warn(`contract check failed: ${error instanceof Error ? error.name : "error"}`);
    }
    return next.handle();
  }

  private check(req: RequestLike): void {
    const path = typeof req.route?.path === "string" ? req.route.path.replace(/^\//, "") : null;
    if (path === null || !req.method) return;
    const route = findRoute(req.method.toUpperCase(), path);
    if (!route) return;
    this.validate(route, "params", route.params, req.params);
    this.validate(route, "query", route.query, req.query);
    this.validate(route, "body", route.body, req.body ?? {});
  }

  private validate(
    route: RouteDefinition,
    part: ContractViolation["part"],
    schema: RouteDefinition["params"],
    value: unknown,
  ): void {
    if (!schema) return;
    const result = checkAgainst(schema, value);
    if (result.ok) return;
    const count = (this.counts.get(route.id) ?? 0) + 1;
    this.counts.set(route.id, count);
    const violation: ContractViolation = {
      event: "contract_violation",
      routeId: route.id,
      method: route.method,
      pathTemplate: `/${route.path}`,
      part,
      issues: result.issues,
      count,
    };
    this.logger.warn(JSON.stringify(violation));
  }
}
