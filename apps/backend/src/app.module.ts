import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>("DATABASE_URL");
        if (url) {
          return {
            type: "postgres",
            url,
            entities: [],
            synchronize: true,
            ssl: { rejectUnauthorized: false },
          };
        }
        return {
          type: "postgres",
          host: configService.get<string>("DB_HOST", "localhost"),
          port: configService.get<number>("DB_PORT", 5432),
          username: configService.get<string>("DB_USER", "postgres"),
          password: configService.get<string>("DB_PASSWORD", "password"),
          database: configService.get<string>("DB_NAME", "flump"),
          entities: [],
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
