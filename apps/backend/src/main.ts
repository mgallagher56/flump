import * as net from "node:net";
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
  const port = Number(configService.get("PORT") ?? 4000);
  await app.listen(port);

  // If running on port 4000, forward port 3000 as well to support existing frontend sessions
  if (port === 4000) {
    const proxy = net.createServer((socket) => {
      const client = net.createConnection({ port: 4000 });
      socket.pipe(client);
      client.pipe(socket);
      socket.on("error", () => client.destroy());
      client.on("error", () => socket.destroy());
    });
    proxy.listen(3000, () => {
      console.log("Port 3000 proxy forwarding to 4000");
    });
    proxy.on("error", () => {});
  }
}
bootstrap();
