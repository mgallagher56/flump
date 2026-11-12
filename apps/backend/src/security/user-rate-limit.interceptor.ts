import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Observable } from "rxjs";
import {
  isExemptPath,
  RATE_LIMIT_CLASS,
  RATE_LIMIT_POLICIES,
  RATE_LIMIT_SKIP,
  type RateLimitClass,
} from "./rate-limit.decorator";
import { rejectRateLimited } from "./rate-limit.http";
import { RateLimitStore } from "./rate-limit.store";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Per-user limits (E20-N13). An interceptor runs after guards, so req.user is set by AuthGuard.
 * Requests without a user are left to the IP guard.
 */
@Injectable()
export class UserRateLimitInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RateLimitStore) private readonly store: RateLimitStore,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_SKIP, targets)) return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest();
    if (isExemptPath(req.path ?? req.url)) return next.handle();
    const userId: unknown = req.user?.id;
    if (typeof userId !== "string" || userId.length === 0) return next.handle();

    const cls: RateLimitClass =
      this.reflector.getAllAndOverride<RateLimitClass>(RATE_LIMIT_CLASS, targets) ??
      (READ_METHODS.has(String(req.method).toUpperCase()) ? "read" : "write");

    const decision = this.store.hit(`user:${userId}:${cls}`, RATE_LIMIT_POLICIES[cls]);
    if (!decision.allowed) {
      const template = `${req.method} ${req.route?.path ?? "unknown"}`;
      rejectRateLimited(http.getResponse(), decision, template, userId);
    }
    return next.handle();
  }
}
