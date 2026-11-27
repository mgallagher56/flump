import {
  type CanActivate,
  Controller,
  type ExecutionContext,
  Get,
  Header,
  type INestApplication,
  Injectable,
  Module,
  UseGuards,
} from "@nestjs/common";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../app.module";
import { NoStoreInterceptor } from "./no-store.interceptor";

/** Signs a request in, as the real AuthGuard does: it sets `request.user`. */
@Injectable()
class SignedIn implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest<{ user?: unknown }>().user = { id: "user_probe" };
    return true;
  }
}

@Controller()
class ProbeController {
  /** A route added tomorrow, with no caching decision of its own. */
  @UseGuards(SignedIn)
  @Get("new-authenticated-route")
  figures() {
    return { balance: 1234.56 };
  }

  @Get("public")
  open() {
    return { ok: true };
  }

  @UseGuards(SignedIn)
  @Header("Cache-Control", "private, max-age=60")
  @Get("chooses-its-own")
  own() {
    return { ok: true };
  }
}

@Module({
  controllers: [ProbeController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: NoStoreInterceptor }],
})
class ProbeModule {}

describe("NoStoreInterceptor", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it("a new authenticated route sends Cache-Control: no-store without asking", async () => {
    const res = await request(app.getHttpServer()).get("/new-authenticated-route");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("keeps the ETag, so conditional requests still work", async () => {
    const first = await request(app.getHttpServer()).get("/new-authenticated-route");
    const etag = first.headers.etag ?? "";
    expect(etag).not.toBe("");
    const again = await request(app.getHttpServer())
      .get("/new-authenticated-route")
      .set("If-None-Match", etag);
    expect(again.status).toBe(304);
  });

  it("leaves a public route alone", async () => {
    const res = await request(app.getHttpServer()).get("/public");
    expect(res.headers["cache-control"]).toBeUndefined();
  });

  it("a route that chooses its own caching keeps its choice", async () => {
    const res = await request(app.getHttpServer()).get("/chooses-its-own");
    expect(res.headers["cache-control"]).toBe("private, max-age=60");
  });

  it("is registered globally in AppModule, so every route gets it", () => {
    const providers: unknown[] = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule) ?? [];
    expect(providers).toContainEqual({ provide: APP_INTERCEPTOR, useClass: NoStoreInterceptor });
  });
});
