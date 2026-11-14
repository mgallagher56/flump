import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { clientKey } from "./client-key";
import { IP_RATE_LIMIT, isExemptPath, RATE_LIMIT_SKIP } from "./rate-limit.decorator";
import { rejectRateLimited } from "./rate-limit.http";
import { RateLimitStore } from "./rate-limit.store";
import { resolveClientIpHmacKey, verifiedClientIp } from "./signed-client-ip";

/**
 * Per-IP ceiling (E20-N13). req.ip honours the single trusted proxy hop set in security.config,
 * so a spoofed X-Forwarded-For cannot change the key. A request from the web server carrying a
 * valid signed client-IP header (M9, signed-client-ip.ts) is keyed by the browser's address
 * instead, so web users no longer share one bucket.
 *
 * In process memory on purpose: it is the highest-volume bucket and a generous ceiling, so a
 * Postgres write per request would cost more than a reset on deploy or a per-replica multiple.
 */
@Injectable()
export class IpRateLimitGuard implements CanActivate {
  private readonly clientIpKey: string | null;

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RateLimitStore) private readonly store: RateLimitStore,
  ) {
    const { key, warning } = resolveClientIpHmacKey(process.env);
    this.clientIpKey = key;
    if (warning && process.env.NODE_ENV === "production") new Logger("RateLimit").warn(warning);
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") return true;
    if (
      this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_SKIP, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    const http = context.switchToHttp();
    const req = http.getRequest();
    if (isExemptPath(req.path ?? req.url)) return true;

    const ip = verifiedClientIp(req.headers, this.clientIpKey) ?? req.ip;
    const decision = this.store.hit(`ip:${clientKey(ip)}`, IP_RATE_LIMIT);
    if (!decision.allowed) {
      rejectRateLimited(
        http.getResponse(),
        decision,
        `${req.method} ${req.route?.path ?? "unknown"}`,
      );
    }
    return true;
  }
}
