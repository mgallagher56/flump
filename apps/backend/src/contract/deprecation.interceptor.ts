import { allRoutes, findRoute, type RouteDefinition } from "@flump/api-contract";
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { API_VERSION_PREFIX, setDeprecationHeaders } from "../config/v1-alias.middleware";

interface RequestLike {
  method?: string;
  route?: { path?: unknown };
  params?: Record<string, unknown>;
}

/** The /v1 URL of `route` with the request's path params filled in (encoded). */
export function successorPath(
  route: RouteDefinition,
  params: Record<string, unknown> = {},
): string {
  const path = route.path.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) =>
    encodeURIComponent(String(params[name] ?? `:${name}`)),
  );
  return `${API_VERSION_PREFIX}/${path}`;
}

/**
 * Deprecated route aliases (`aliasOf` in the manifest, docs/api/versioning.md) answer with
 * `Deprecation: true` and a `Link` to the route that replaces them, on /v1 and unversioned paths
 * alike. Runs whatever the contract mode, and never fails a request.
 */
@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();
    try {
      const http = context.switchToHttp();
      const req = http.getRequest<RequestLike>();
      const path = typeof req.route?.path === "string" ? req.route.path.replace(/^\//, "") : null;
      const route = path !== null && req.method ? findRoute(req.method.toUpperCase(), path) : null;
      const successor = route?.aliasOf ? allRoutes.find((r) => r.id === route.aliasOf) : undefined;
      if (successor)
        setDeprecationHeaders(http.getResponse(), successorPath(successor, req.params));
    } catch {
      // Headers are advisory: a failure here must never affect the request.
    }
    return next.handle();
  }
}
