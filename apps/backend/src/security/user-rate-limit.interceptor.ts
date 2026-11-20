import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
  type NestInterceptor,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { from, type Observable, switchMap } from "rxjs";
import { clientKey } from "./client-key";
import {
  ADDRESS_KEYED_RATE_LIMIT_CLASSES,
  FAIL_CLOSED_RATE_LIMIT_CLASSES,
  isExemptPath,
  RATE_LIMIT_CLASS,
  RATE_LIMIT_POLICIES,
  RATE_LIMIT_SKIP,
  type RateLimitClass,
  SHARED_RATE_LIMIT_CLASSES,
} from "./rate-limit.decorator";
import { rejectRateLimited } from "./rate-limit.http";
import {
  type RateLimitDecision,
  RateLimitStore,
  type SharedRateLimitStore,
} from "./rate-limit.store";
import { isMissingTableError, SHARED_RATE_LIMIT_STORE } from "./shared-rate-limit";
import { resolveClientIpHmacKey, verifiedClientIp } from "./signed-client-ip";

const RATE_LIMIT_UNAVAILABLE = "This action is unavailable right now. Try again shortly.";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Per-user limits (E20-N13). An interceptor runs after guards, so req.user is set by AuthGuard.
 * Requests without a user are left to the IP guard.
 *
 * Classes in SHARED_RATE_LIMIT_CLASSES are counted in the shared Postgres store (BE-07, M10); the
 * rest in process memory. When Postgres fails, FAIL_CLOSED_RATE_LIMIT_CLASSES answer 503 and the
 * other shared classes fall back to the in-memory counters (fail open, still limited per process).
 * An unmigrated schema (a DB_SYNCHRONIZE dev database) falls back to memory for every class.
 */
@Injectable()
export class UserRateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger("RateLimit");
  private warnedMissingTable = false;
  private readonly clientIpKey: string | null;

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RateLimitStore) private readonly store: RateLimitStore,
    @Inject(SHARED_RATE_LIMIT_STORE) private readonly shared: SharedRateLimitStore,
  ) {
    // The same client address the per-IP guard keys by (signed web header, else the socket).
    this.clientIpKey = resolveClientIpHmacKey(process.env).key;
  }

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

    const keys = [`user:${userId}:${cls}`];
    if (ADDRESS_KEYED_RATE_LIMIT_CLASSES.has(cls)) {
      const ip = verifiedClientIp(req.headers ?? {}, this.clientIpKey) ?? req.ip;
      keys.push(`ip:${clientKey(ip)}:${cls}`);
    }
    const enforce = (decision: RateLimitDecision) => {
      if (!decision.allowed) {
        const template = `${req.method} ${req.route?.path ?? "unknown"}`;
        rejectRateLimited(http.getResponse(), decision, template, userId);
      }
    };
    if (!SHARED_RATE_LIMIT_CLASSES.has(cls)) {
      for (const key of keys) enforce(this.store.hit(key, RATE_LIMIT_POLICIES[cls]));
      return next.handle();
    }
    return from(this.sharedHits(keys, cls)).pipe(
      switchMap((decision) => {
        enforce(decision);
        return next.handle();
      }),
    );
  }

  /** Every key is counted (so the address bucket fills even when the user bucket refuses). */
  private async sharedHits(keys: string[], cls: RateLimitClass): Promise<RateLimitDecision> {
    let refused: RateLimitDecision | null = null;
    let last: RateLimitDecision | null = null;
    for (const key of keys) {
      last = await this.sharedHit(key, cls);
      if (!last.allowed && !refused) refused = last;
    }
    return (refused ?? last) as RateLimitDecision;
  }

  private async sharedHit(key: string, cls: RateLimitClass): Promise<RateLimitDecision> {
    const windows = RATE_LIMIT_POLICIES[cls];
    try {
      return await this.shared.hit(key, windows);
    } catch (err) {
      const reason = err instanceof Error ? err.name : "error";
      if (isMissingTableError(err)) {
        if (!this.warnedMissingTable) {
          this.warnedMissingTable = true;
          this.logger.warn("rate_limit_buckets is missing (unmigrated schema): limits in memory");
        }
      } else if (FAIL_CLOSED_RATE_LIMIT_CLASSES.has(cls)) {
        this.logger.error(`ratelimit_store_failed class=${cls} outcome=refused reason=${reason}`);
        throw new ServiceUnavailableException(RATE_LIMIT_UNAVAILABLE);
      } else {
        this.logger.warn(`ratelimit_store_failed class=${cls} outcome=memory reason=${reason}`);
      }
      return this.store.hit(key, windows);
    }
  }
}
