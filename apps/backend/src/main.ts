import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  const corsOrigins = configService.get<string>("CORS_ALLOWED_ORIGINS")
    ? configService.get<string>("CORS_ALLOWED_ORIGINS")?.split(",")
    : [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8082",
      ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  await app.listen(configService.get("PORT") ?? 3000);
}
bootstrap();
