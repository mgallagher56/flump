"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        rawBody: true,
    });
    const configService = app.get(config_1.ConfigService);
    const corsOrigins = configService.get("CORS_ALLOWED_ORIGINS")
        ? configService.get("CORS_ALLOWED_ORIGINS")?.split(",")
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
//# sourceMappingURL=main.js.map