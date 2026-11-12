import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { applySecurity } from "./config/security.config";

async function bootstrap() {
  // Body parsing is configured in applySecurity (explicit per-route limits).
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);

  applySecurity(app, {
    NODE_ENV: process.env.NODE_ENV,
    CORS_ALLOWED_ORIGINS: configService.get<string>("CORS_ALLOWED_ORIGINS"),
    TRUST_PROXY_HOPS: configService.get<string>("TRUST_PROXY_HOPS"),
  });
  // Close the TypeORM pool (and other providers) on SIGTERM/SIGINT.
  app.enableShutdownHooks();
  const port = Number(configService.get("PORT") ?? 4000);
  await app.listen(port, "0.0.0.0");
}
bootstrap();
