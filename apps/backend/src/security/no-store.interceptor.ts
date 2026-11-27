import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";

/**
 * `Cache-Control: no-store` on every authenticated response, by default (E12 S7, found by the
 * coordinator's device check: Android's HTTP cache held the money endpoints' answers in plain
 * files). Registered once in `AppModule`, so a new route gets it without asking. Interceptors run
 * after guards, so `request.user` is set exactly when the route signed someone in.
 *
 * Only when nothing has set `Cache-Control` yet (Nest applies `@Header` before interceptors), and
 * before the handler runs, so a route that chooses its own caching, either way, still wins. ETags are untouched: Express still sends them, and nothing in the
 * web app or the API client sends `If-None-Match`; writes use `If-Match` built from `updatedAt`.
 * Before this, an authenticated GET carried an ETag and no `Cache-Control`, which browsers keep in
 * their disk cache and revalidate, so the web app's figures sat in the browser cache too.
 */
@Injectable()
export class NoStoreInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === "http") {
      const http = context.switchToHttp();
      // `user` from AuthGuard; `mcpToken` from McpPatGuard (a personal access token's owner).
      const request = http.getRequest<{ user?: unknown; mcpToken?: unknown }>();
      const user = request?.user ?? request?.mcpToken;
      const response = http.getResponse<{
        headersSent?: boolean;
        getHeader?: (name: string) => unknown;
        setHeader?: (name: string, value: string) => void;
      }>();
      const chosen = response?.getHeader?.("Cache-Control") !== undefined;
      if (user && !chosen && !response?.headersSent) {
        response?.setHeader?.("Cache-Control", "no-store");
      }
    }
    return next.handle();
  }
}
