import { Inject, Logger, Module, type OnApplicationBootstrap } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, HttpAdapterHost } from "@nestjs/core";
import { IpRateLimitGuard } from "./ip-rate-limit.guard";
import { RateLimitStore } from "./rate-limit.store";
import { UserRateLimitInterceptor } from "./user-rate-limit.interceptor";

@Module({
  providers: [
    RateLimitStore,
    { provide: APP_GUARD, useClass: IpRateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: UserRateLimitInterceptor },
  ],
  // Exported so the MCP import adapter shares the per-user importStage budget (E17 PR D).
  exports: [RateLimitStore],
})
export class SecurityModule implements OnApplicationBootstrap {
  constructor(@Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost) {}

  /**
   * Behind a proxy with trust proxy unset, every request shares the proxy's IP, so the per-IP
   * ceiling would throttle all users together. Revisit TRUST_PROXY_HOPS if the edge changes.
   */
  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV !== "production") return;
    const instance = this.adapterHost.httpAdapter?.getInstance?.();
    const trust = typeof instance?.get === "function" ? instance.get("trust proxy") : undefined;
    if (!trust) {
      new Logger("RateLimit").warn(
        "Rate limiting is active but trust proxy is unset: per-IP limits will key on the proxy address. Set TRUST_PROXY_HOPS.",
      );
    }
  }
}
