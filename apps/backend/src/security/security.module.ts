import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { IpRateLimitGuard } from "./ip-rate-limit.guard";
import { RateLimitStore } from "./rate-limit.store";
import { UserRateLimitInterceptor } from "./user-rate-limit.interceptor";

@Module({
  providers: [
    RateLimitStore,
    { provide: APP_GUARD, useClass: IpRateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: UserRateLimitInterceptor },
  ],
})
export class SecurityModule {}
