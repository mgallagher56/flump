import { Module, OnApplicationShutdown } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { closeReporter } from "./report";
import { SentryExceptionFilter } from "./sentry-exception.filter";

@Module({
  providers: [{ provide: APP_FILTER, useClass: SentryExceptionFilter }],
})
export class ObservabilityModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await closeReporter(2000);
  }
}
