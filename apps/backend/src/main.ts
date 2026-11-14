import "./config/timezone";
import "./instrument";
import "reflect-metadata";
import { ConfigModule } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { validateBootEnv } from "./config/boot-guards";
import { applySecurity } from "./config/security.config";
import { crash, installCrashHandlers } from "./observability/crash-policy";
import { createAppLogger } from "./observability/logger";
import { requestContextMiddleware } from "./observability/request-context.middleware";

// Built from the raw environment so a config failure can still be logged (scrubbed) before exit.
const logger = createAppLogger(process.env);
installCrashHandlers({ logger });

async function bootstrap() {
  // AppModule's ConfigModule.forRoot loads a local .env into process.env; wait for it.
  await ConfigModule.envVariablesLoaded;
  // M18: every variable is checked once, before Nest builds a single provider. Throws a named
  // error (EnvValidationError or a boot guard) naming variables only.
  const env = validateBootEnv(process.env);

  // Body parsing is configured in applySecurity (explicit per-route limits).
  const app = await NestFactory.create(AppModule, { bodyParser: false, logger });

  // Before applySecurity so the id and access log cover every request, including the v1 alias.
  app.use(requestContextMiddleware);
  applySecurity(app, {
    NODE_ENV: env.NODE_ENV,
    CORS_ALLOWED_ORIGINS: env.CORS_ALLOWED_ORIGINS,
    TRUST_PROXY_HOPS: env.TRUST_PROXY_HOPS?.toString(),
  });
  // Close the TypeORM pool (and other providers) on SIGTERM/SIGINT.
  app.enableShutdownHooks();
  await app.listen(env.PORT ?? 4000, "0.0.0.0");
}

// L7: a failed boot is logged (scrubbed), reported, flushed with a timeout and exits 1.
bootstrap().catch((error: unknown) => crash("bootstrap", error, { logger }));
