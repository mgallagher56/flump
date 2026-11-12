import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { describe, expect, it, vi } from "vitest";

describe("graceful shutdown (A-03)", () => {
  it("enableShutdownHooks + close() destroys the TypeORM DataSource", async () => {
    const destroy = vi.fn(async () => {});
    const fake = { isInitialized: true, destroy, options: {} };
    @Module({
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: () => ({ type: "postgres" }) as never,
          dataSourceFactory: async () => fake as never,
        }),
      ],
    })
    class TestModule {}

    const app = await NestFactory.create(TestModule, { logger: false });
    app.enableShutdownHooks();
    await app.init();
    expect(destroy).not.toHaveBeenCalled();
    await app.close();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("main.ts enables shutdown hooks before listen()", () => {
    const src = readFileSync(join(__dirname, "main.ts"), "utf8");
    const hooks = src.indexOf("app.enableShutdownHooks()");
    const listen = src.indexOf("app.listen(");
    expect(hooks).toBeGreaterThan(-1);
    expect(listen).toBeGreaterThan(hooks);
  });
});
