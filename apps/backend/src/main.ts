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
      ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  await app.listen(configService.get("PORT") ?? 3000);
}
bootstrap();
