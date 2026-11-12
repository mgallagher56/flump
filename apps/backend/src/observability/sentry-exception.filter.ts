import { ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { reportException } from "./sentry";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

function requestIdOf(host: ArgumentsHost): string | undefined {
  const req = host.switchToHttp().getRequest<{ headers?: Record<string, unknown> }>();
  const raw = req?.headers?.["x-request-id"] ?? req?.headers?.["x-railway-request-id"];
  return typeof raw === "string" && SAFE_REQUEST_ID.test(raw) ? raw : undefined;
}

/** Reports unexpected errors and 5xx responses, then lets Nest's default handling respond. */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    if (!(exception instanceof HttpException) || exception.getStatus() >= 500) {
      reportException(exception, requestIdOf(host));
    }
    super.catch(exception, host);
  }
}
