import { Module, OnApplicationShutdown } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ApiExceptionFilter } from "../contract/api-exception.filter";
import { closeReporter } from "./report";

@Module({
  // One global filter: the BE-09 error envelope plus Sentry reporting of unexpected errors.
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class ObservabilityModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await closeReporter(2000);
  }
}
